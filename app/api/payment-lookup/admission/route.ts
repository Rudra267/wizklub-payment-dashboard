import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function readSuccess(payload: unknown, responseOk: boolean) {
  if (!payload || typeof payload !== "object") {
    return responseOk;
  }

  const objectPayload = payload as {
    data?: unknown;
    isSuccess?: unknown;
    message?: unknown;
    paid?: unknown;
    paymentStatus?: unknown;
    status?: unknown;
    success?: unknown;
  };

  if (typeof objectPayload.success === "boolean") {
    return objectPayload.success;
  }

  if (typeof objectPayload.isSuccess === "boolean") {
    return objectPayload.isSuccess;
  }

  if (typeof objectPayload.paid === "boolean") {
    return objectPayload.paid;
  }

  const statusValue = objectPayload.paymentStatus ?? objectPayload.status;

  if (typeof statusValue === "string") {
    const normalized = statusValue.toLowerCase();

    if (
      normalized.includes("success") ||
      normalized.includes("paid") ||
      normalized.includes("captured")
    ) {
      return true;
    }

    if (
      normalized.includes("fail") ||
      normalized.includes("pending") ||
      normalized.includes("cancel")
    ) {
      return false;
    }
  }

  if (objectPayload.data && typeof objectPayload.data === "object") {
    return readSuccess(objectPayload.data, responseOk);
  }

  return responseOk;
}

function readMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const objectPayload = payload as {
    data?: unknown;
    error?: unknown;
    message?: unknown;
  };

  if (typeof objectPayload.message === "string" && objectPayload.message.trim()) {
    return objectPayload.message;
  }

  if (typeof objectPayload.error === "string" && objectPayload.error.trim()) {
    return objectPayload.error;
  }

  if (objectPayload.data && typeof objectPayload.data === "object") {
    return readMessage(objectPayload.data, fallback);
  }

  return fallback;
}

function parseIds(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFirstFailureMessage(
  results: { message: string; success: boolean }[],
  fallback: string
) {
  return results.find((result) => !result.success)?.message || fallback;
}

function readRazorpayStatusSuccess(payload: unknown, responseOk: boolean) {
  if (!payload || typeof payload !== "object") {
    return responseOk;
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

async function checkRazorpayAdmissionPaymentStatus(transactionId: string) {
  const url = new URL(
    "https://api.srichaitanyaschool.net/v3/grievance-api/check-razorpay-payment-status"
  );
  url.searchParams.set("table_name", "admission_payments");
  url.searchParams.set("transaction_id", transactionId);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    method: "GET"
  });
  const payload = await response.json().catch(() => null);
  const success = response.ok && readRazorpayStatusSuccess(payload, response.ok);

  return {
    message: readMessage(
      payload,
      success ? "Payment completed successfully." : "Payment is not completed."
    ),
    payload,
    success,
    transactionId
  };
}

async function updateAdmissionPayment(transactionId: string) {
  const url = new URL(
    "https://srichaitanyaschool.net/admission-payments/check-student-admission-razorpay"
  );
  url.searchParams.set("transaction_id", transactionId);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    method: "GET"
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  const success =
    typeof payload === "string"
      ? response.ok && payload.toLowerCase().includes("success")
      : response.ok && readSuccess(payload, response.ok);
  const fallback = success
    ? "Admission payment fetched successfully."
    : "Admission payment lookup failed.";

  return {
    message:
      typeof payload === "string" && payload.trim()
        ? payload
        : readMessage(payload, fallback),
    success,
    transactionId
  };
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    transactionId?: string;
  } | null;
  const ids = parseIds(body?.transactionId || "");

  if (ids.length === 0) {
    return NextResponse.json(
      { message: "Please enter at least one transaction ID.", success: false },
      { status: 400 }
    );
  }

  try {
    const statusResults = await Promise.all(
      ids.map((id) => checkRazorpayAdmissionPaymentStatus(id))
    );
    const successfulTransactionIds = statusResults
      .filter((result) => result.success)
      .map((result) => result.transactionId);
    const failedStatusTransactionIds = statusResults
      .filter((result) => !result.success)
      .map((result) => result.transactionId);

    if (successfulTransactionIds.length === 0) {
      return NextResponse.json(
        {
          failedIds: failedStatusTransactionIds,
          message: readFirstFailureMessage(
            statusResults,
            "No completed admission payments found to update."
          ),
          results: statusResults,
          success: false
        },
        { status: 400 }
      );
    }

    const updateResults = await Promise.all(
      successfulTransactionIds.map((id) => updateAdmissionPayment(id))
    );
    const failedUpdateTransactionIds = updateResults
      .filter((result) => !result.success)
      .map((result) => result.transactionId);
    const failedIds = [...failedStatusTransactionIds, ...failedUpdateTransactionIds];
    const success = failedIds.length === 0;
    const successCount = ids.length - failedIds.length;

    return NextResponse.json(
      {
        failedIds,
        message:
          ids.length === 1
            ? updateResults[0]?.message ||
              statusResults[0]?.message ||
              "Admission payment lookup completed."
            : `${successCount}/${ids.length} admission payment lookups successful.${
                failedIds.length
                  ? ` ${readFirstFailureMessage(
                      [...statusResults, ...updateResults],
                      "Some admission payments failed."
                    )}`
                  : ""
              }`,
        results: statusResults.map((statusResult) => ({
          ...statusResult,
          updated:
            statusResult.success &&
            updateResults.some(
              (updateResult) =>
                updateResult.transactionId === statusResult.transactionId &&
                updateResult.success
            )
        })),
        updateResults,
        success
      },
      { status: success ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to admission payment API.", success: false },
      { status: 502 }
    );
  }
}
