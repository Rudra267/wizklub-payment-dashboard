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
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
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

  const statusCheckUrl =
    process.env.TRANSACTION_STATUS_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/check-razorpay-book-payment-status";
  const url = new URL(statusCheckUrl);
  url.searchParams.set("transaction_id", matchedTransactionIds[0] as string);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json();
    const success = response.ok && readSuccess(payload);

    return NextResponse.json(
      {
        message: readMessage(
          payload,
          success ? "Payment completed successfully." : "Payment not completed."
        ),
        success
      },
      { status: success ? 200 : response.status >= 400 ? response.status : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to payment status API.", success: false },
      { status: 502 }
    );
  }
}
