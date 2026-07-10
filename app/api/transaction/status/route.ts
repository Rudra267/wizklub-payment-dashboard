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

function readRazorpayStatusSuccess(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const objectPayload = payload as Record<string, unknown>;

  if (typeof objectPayload.status === "boolean") {
    return objectPayload.status;
  }

  if (typeof objectPayload.success === "boolean") {
    return objectPayload.success;
  }

  const razorpayResponse =
    objectPayload.razorpay_response && typeof objectPayload.razorpay_response === "object"
      ? (objectPayload.razorpay_response as Record<string, unknown>)
      : null;
  const statusValues = [
    objectPayload.payment_status,
    objectPayload.paymentStatus,
    typeof objectPayload.status === "string" ? objectPayload.status : undefined,
    razorpayResponse?.status
  ];

  return statusValues.some((value) => {
    if (typeof value !== "string") {
      return false;
    }

    return ["captured", "paid", "success", "successful"].includes(
      value.trim().toLowerCase()
    );
  });
}

function getTransactionIds(value: string) {
  return value.match(/ORDS-KIT[a-zA-Z0-9]+/g) || [];
}

function readMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String((payload as { message: unknown }).message);
  }

  return fallback;
}

function readFirstFailureMessage(
  results: { message: string; success: boolean }[],
  fallback: string
) {
  return results.find((result) => !result.success)?.message || fallback;
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    transactionId?: string;
  } | null;
  const matchedTransactionIds = getTransactionIds(body?.transactionId || "");

  if (matchedTransactionIds.length === 0) {
    return NextResponse.json(
      { message: "Please enter at least one ORDS-KIT transaction ID.", success: false },
      { status: 400 }
    );
  }

  const statusCheckUrl =
    process.env.TRANSACTION_STATUS_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/check-razorpay-payment-status";

  try {
    const results = await Promise.all(
      matchedTransactionIds.map(async (transactionId) => {
        const url = new URL(statusCheckUrl);
        url.searchParams.set("table_name", "book_payments");
        url.searchParams.set("transaction_id", transactionId);

        const response = await fetch(url, {
          headers: {
            Accept: "application/json"
          },
          method: "GET"
        });
        const payload = await response.json().catch(() => null);
        const success =
          response.ok &&
          (readRazorpayStatusSuccess(payload) || readSuccess(payload));

        return {
          message: readMessage(
            payload,
            success ? "Payment completed successfully." : "Payment not completed."
          ),
          payload,
          success,
          transactionId
        };
      })
    );
    const failedIds = results
      .filter((result) => !result.success)
      .map((result) => result.transactionId);
    const success = failedIds.length === 0;

    return NextResponse.json(
      {
        failedIds,
        message:
          results.length === 1
            ? results[0]?.message || "Payment status checked."
            : `${results.length - failedIds.length}/${results.length} book payment status checks successful.${
                failedIds.length
                  ? ` ${readFirstFailureMessage(
                      results,
                      "Some book payment status checks failed."
                    )}`
                  : ""
              }`,
        results,
        success
      },
      { status: success ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to payment status API.", success: false },
      { status: 502 }
    );
  }
}
