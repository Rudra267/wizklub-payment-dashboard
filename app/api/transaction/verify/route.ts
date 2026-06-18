import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

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

  if (typeof objectPayload.status === "boolean") {
    return objectPayload.status;
  }

  if (typeof objectPayload.status === "string") {
    return ["success", "successful", "verified", "paid", "captured"].includes(
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

async function callTransactionApi(
  apiUrl: string,
  transactionId: string,
  successFallback: string,
  failureFallback: string
) {
  const url = new URL(apiUrl);
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

    return {
      message: success ? successFallback : failureFallback,
      responseStatus: response.status,
      success
    };
  }

  const payload = await response.json();
  const success = response.ok && readSuccess(payload);

  return {
    message: readMessage(payload, success ? successFallback : failureFallback),
    responseStatus: response.status,
    success
  };
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    skipStatusCheck?: boolean;
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
  const statusCheckUrl =
    process.env.TRANSACTION_STATUS_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/check-razorpay-book-payment-status";
  const verifyUrl = process.env.TRANSACTION_VERIFY_API_URL;
  const defaultVerifyUrl =
    "https://srichaitanyaschool.net/book-kits-payments/check-book-sales-payment-razorpay";

  if (!verifyUrl) {
    try {
      if (!body?.skipStatusCheck) {
        const statusCheck = await callTransactionApi(
          statusCheckUrl,
          transactionId,
          "Payment transaction is successful.",
          "Payment transaction is not successful."
        );

        if (!statusCheck.success) {
          return NextResponse.json(
            { message: statusCheck.message, success: false },
            { status: statusCheck.responseStatus >= 400 ? statusCheck.responseStatus : 400 }
          );
        }
      }

      const receiptGeneration = await callTransactionApi(
        defaultVerifyUrl,
        transactionId,
        "Receipt generated. Reach out site for download receipt.",
        "Transaction verification failed."
      );

      return NextResponse.json(
        {
          message: receiptGeneration.message,
          success: receiptGeneration.success
        },
        { status: receiptGeneration.success ? 200 : 400 }
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
    if (!body?.skipStatusCheck) {
      const statusCheck = await callTransactionApi(
        statusCheckUrl,
        transactionId,
        "Payment transaction is successful.",
        "Payment transaction is not successful."
      );

      if (!statusCheck.success) {
        return NextResponse.json(
          { message: statusCheck.message, success: false },
          { status: statusCheck.responseStatus >= 400 ? statusCheck.responseStatus : 400 }
        );
      }
    }

    const receiptGeneration = await callTransactionApi(
      verifyUrl || defaultVerifyUrl,
      transactionId,
      "Receipt generated. Reach out site for download receipt.",
      "Transaction verification failed."
    );

    return NextResponse.json(
      {
        message: receiptGeneration.message,
        success: receiptGeneration.success
      },
      { status: receiptGeneration.success ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to transaction verification API.", success: false },
      { status: 502 }
    );
  }
}
