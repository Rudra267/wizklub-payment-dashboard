import { NextRequest, NextResponse } from "next/server";
import { isDashboardAuthenticated, unauthorizedDashboardResponse } from "../../auth-utils";

function readSuccess(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const objectPayload = payload as {
    isSuccess?: unknown;
    success?: unknown;
    status?: unknown;
    verified?: unknown;
  };

  if (typeof objectPayload.success === "boolean") {
    return objectPayload.success;
  }

  if (typeof objectPayload.isSuccess === "boolean") {
    return objectPayload.isSuccess;
  }

  if (typeof objectPayload.verified === "boolean") {
    return objectPayload.verified;
  }

  if (typeof objectPayload.status === "string") {
    return ["success", "successful", "verified", "paid"].includes(
      objectPayload.status.toLowerCase()
    );
  }

  return false;
}

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}

function readTextSuccess(text: string) {
  return text.toLowerCase().includes("success");
}

function getSingleTransactionId(value: string) {
  return value.match(/ORDS-KIT[a-zA-Z0-9]+/g) || [];
}

function readMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String((payload as { message: unknown }).message);
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  if (!isDashboardAuthenticated(request)) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    transactionId?: string;
  } | null;
  const matchedTransactionIds = getSingleTransactionId(body?.transactionId || "");

  if (matchedTransactionIds.length === 0) {
    return NextResponse.json(
      { message: "Please enter one ORDS-KIT transaction ID.", success: false },
      { status: 400 }
    );
  }

  if (matchedTransactionIds.length > 1) {
    return NextResponse.json(
      {
        message: "Please verify only one ORDS-KIT transaction ID at a time.",
        success: false
      },
      { status: 400 }
    );
  }

  const transactionId = matchedTransactionIds[0] as string;
  const verifyUrl = process.env.TRANSACTION_VERIFY_API_URL;
  const defaultVerifyUrl =
    "https://srichaitanyaschool.net/book-kits-payments/check-book-sales-payment-razorpay";

  if (!verifyUrl) {
    const razorpayUrl = new URL(defaultVerifyUrl);
    razorpayUrl.searchParams.set("transaction_id", transactionId);

    try {
      const response = await fetch(razorpayUrl, {
        headers: {
          Accept: "application/json, text/plain, */*"
        },
        method: "GET"
      });

      if (isJsonResponse(response)) {
        const payload = await response.json();
        const success = response.ok && readSuccess(payload);

        return NextResponse.json(
          {
            message: readMessage(
              payload,
              success
                ? "Receipt generated. Reach out site for download receipt."
                : "Transaction verification failed."
            ),
            success
          },
          { status: success ? 200 : 400 }
        );
      }

      const text = await response.text();
      const success = response.ok && readTextSuccess(text);

      return NextResponse.json(
        {
          message: success
            ? "Receipt generated. Reach out site for download receipt."
            : "Transaction verification failed.",
          success
        },
        { status: success ? 200 : 400 }
      );
    } catch {
      return NextResponse.json(
        { message: "Unable to connect to transaction verification API.", success: false },
        { status: 502 }
      );
    }
  }

  if (verifyUrl === "demo") {
    const isDemoSuccess = transactionId.toUpperCase().startsWith("ORDS-KIT");

    return NextResponse.json(
      {
        message: isDemoSuccess
          ? "Demo check successful. Add TRANSACTION_VERIFY_API_URL for real verification."
          : "Use a transaction ID starting with ORDS-KIT.",
        success: isDemoSuccess
      },
      { status: isDemoSuccess ? 200 : 400 }
    );
  }

  try {
    const url = new URL(verifyUrl || defaultVerifyUrl);
    url.searchParams.set("transaction_id", transactionId);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*"
      },
      method: "GET"
    });

    if (!isJsonResponse(response)) {
      const text = await response.text();
      const success = response.ok && readTextSuccess(text);

      return NextResponse.json(
        {
          message: success
            ? "Receipt generated. Reach out site for download receipt."
            : "Transaction verification failed.",
          success
        },
        { status: success ? 200 : 400 }
      );
    }

    const payload = await response.json();
    const success = response.ok && readSuccess(payload);

    return NextResponse.json(
      {
        message: readMessage(
          payload,
          success
            ? "Receipt generated. Reach out site for download receipt."
            : "Transaction verification failed."
        ),
        success
      },
      { status: success ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to transaction verification API.", success: false },
      { status: 502 }
    );
  }
}
