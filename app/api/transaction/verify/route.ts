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

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}

function readTextSuccess(text: string) {
  return text.toLowerCase().includes("success");
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

async function checkBookPaymentStatus(apiUrl: string, transactionId: string) {
  const url = new URL(apiUrl);
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
    response.ok && (readRazorpayStatusSuccess(payload) || readSuccess(payload));

  return {
    message: readMessage(
      payload,
      success ? "Payment transaction is successful." : "Payment transaction is not successful."
    ),
    responseStatus: response.status,
    success,
    transactionId
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
  const verifyUrl = process.env.TRANSACTION_VERIFY_API_URL;
  const defaultVerifyUrl =
    "https://srichaitanyaschool.net/book-kits-payments/check-book-sales-payment-razorpay";

  if (!verifyUrl) {
    try {
      const statusResults = body?.skipStatusCheck
        ? matchedTransactionIds.map((transactionId) => ({
            message: "Payment transaction is successful.",
            responseStatus: 200,
            success: true,
            transactionId
          }))
        : await Promise.all(
            matchedTransactionIds.map((transactionId) =>
              checkBookPaymentStatus(statusCheckUrl, transactionId)
            )
          );
      const successfulTransactionIds = statusResults
        .filter((result) => result.success)
        .map((result) => result.transactionId);
      const failedStatusIds = statusResults
        .filter((result) => !result.success)
        .map((result) => result.transactionId);

      if (successfulTransactionIds.length === 0) {
        return NextResponse.json(
          {
            failedIds: failedStatusIds,
            message: readFirstFailureMessage(
              statusResults,
              "No completed book payments found to generate receipt."
            ),
            results: statusResults,
            success: false
          },
          { status: 400 }
        );
      }

      const receiptResults = await Promise.all(
        successfulTransactionIds.map((transactionId) =>
          callTransactionApi(
            defaultVerifyUrl,
            transactionId,
            "Receipt generated. Reach out site for download receipt.",
            "Transaction verification failed."
          )
        )
      );
      const failedReceiptIds = receiptResults
        .map((result, index) => ({
          ...result,
          transactionId: successfulTransactionIds[index] as string
        }))
        .filter((result) => !result.success)
        .map((result) => result.transactionId);
      const failedIds = [...failedStatusIds, ...failedReceiptIds];
      const success = failedIds.length === 0;

      return NextResponse.json(
        {
          failedIds,
          message:
            matchedTransactionIds.length === 1
              ? receiptResults[0]?.message || statusResults[0]?.message || "Book payment verification completed."
              : `${matchedTransactionIds.length - failedIds.length}/${matchedTransactionIds.length} book payment receipt generations successful.${
                  failedIds.length
                    ? ` ${readFirstFailureMessage(
                        [...statusResults, ...receiptResults],
                        "Some book payment receipt generations failed."
                      )}`
                    : ""
                }`,
          results: statusResults.map((statusResult) => ({
            ...statusResult,
            updated:
              statusResult.success &&
              !failedReceiptIds.includes(statusResult.transactionId)
          })),
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
    const isDemoSuccess = matchedTransactionIds.every((transactionId) =>
      transactionId.toUpperCase().startsWith("ORDS-KIT")
    );

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
    const statusResults = body?.skipStatusCheck
      ? matchedTransactionIds.map((transactionId) => ({
          message: "Payment transaction is successful.",
          responseStatus: 200,
          success: true,
          transactionId
        }))
      : await Promise.all(
          matchedTransactionIds.map((transactionId) =>
            checkBookPaymentStatus(statusCheckUrl, transactionId)
          )
        );
    const successfulTransactionIds = statusResults
      .filter((result) => result.success)
      .map((result) => result.transactionId);
    const failedStatusIds = statusResults
      .filter((result) => !result.success)
      .map((result) => result.transactionId);

    if (successfulTransactionIds.length === 0) {
      return NextResponse.json(
        {
          failedIds: failedStatusIds,
          message: readFirstFailureMessage(
            statusResults,
            "No completed book payments found to generate receipt."
          ),
          results: statusResults,
          success: false
        },
        { status: 400 }
      );
    }

    const receiptResults = await Promise.all(
      successfulTransactionIds.map((transactionId) =>
        callTransactionApi(
          verifyUrl || defaultVerifyUrl,
          transactionId,
          "Receipt generated. Reach out site for download receipt.",
          "Transaction verification failed."
        )
      )
    );
    const failedReceiptIds = receiptResults
      .map((result, index) => ({
        ...result,
        transactionId: successfulTransactionIds[index] as string
      }))
      .filter((result) => !result.success)
      .map((result) => result.transactionId);
    const failedIds = [...failedStatusIds, ...failedReceiptIds];
    const success = failedIds.length === 0;

    return NextResponse.json(
      {
        failedIds,
        message:
          matchedTransactionIds.length === 1
            ? receiptResults[0]?.message || statusResults[0]?.message || "Book payment verification completed."
            : `${matchedTransactionIds.length - failedIds.length}/${matchedTransactionIds.length} book payment receipt generations successful.${
                failedIds.length
                  ? ` ${readFirstFailureMessage(
                      [...statusResults, ...receiptResults],
                      "Some book payment receipt generations failed."
                    )}`
                  : ""
              }`,
        results: statusResults.map((statusResult) => ({
          ...statusResult,
          updated:
            statusResult.success && !failedReceiptIds.includes(statusResult.transactionId)
        })),
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
