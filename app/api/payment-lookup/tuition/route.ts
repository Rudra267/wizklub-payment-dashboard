import { request as httpsRequest } from "https";
import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function readSuccess(payload: unknown, responseOk: boolean) {
  if (!payload || typeof payload !== "object") {
    return responseOk;
  }

  const objectPayload = payload as {
    data?: unknown;
    isSuccess?: unknown;
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

  const statusValue = objectPayload.paymentStatus ?? objectPayload.status;

  if (typeof statusValue === "string") {
    const normalized = statusValue.toLowerCase();

    if (
      normalized.includes("success") ||
      normalized.includes("paid") ||
      normalized.includes("updated")
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

async function checkRazorpayPaymentStatus(orderId: string) {
  const url = new URL(
    "https://api.srichaitanyaschool.net/v3/grievance-api/check-razorpay-payment-status"
  );
  url.searchParams.set("table_name", "payments");
  url.searchParams.set("transaction_id", orderId);

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
    orderId,
    payload,
    success
  };
}

function sendJsonRequest(url: string, method: "GET" | "POST", body: unknown) {
  return new Promise<{
    contentType: string;
    ok: boolean;
    payload: unknown;
    status: number;
  }>((resolve, reject) => {
    const requestBody = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const request = httpsRequest(
      parsedUrl,
      {
        headers: {
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          "Content-Type": "application/json"
        },
        method
      },
      (response) => {
        let responseBody = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          const contentType = response.headers["content-type"] || "";
          const status = response.statusCode || 500;
          let payload: unknown = responseBody;

          if (typeof contentType === "string" && contentType.includes("application/json")) {
            try {
              payload = JSON.parse(responseBody || "null");
            } catch {
              payload = responseBody;
            }
          }

          resolve({
            contentType: Array.isArray(contentType) ? contentType.join(";") : contentType,
            ok: status >= 200 && status < 300,
            payload,
            status
          });
        });
      }
    );

    request.on("error", reject);
    request.write(requestBody);
    request.end();
  });
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    ids?: string;
    provider?: string;
  } | null;
  const provider = body?.provider === "cashfree" ? "cashfree" : "razorpay";
  const ids = parseIds(body?.ids || "");

  if (ids.length === 0) {
    return NextResponse.json(
      {
        message:
          provider === "razorpay"
            ? "Please enter at least one Razorpay order ID."
            : "Please enter at least one Cashfree transaction ID.",
        success: false
      },
      { status: 400 }
    );
  }

  const url =
    provider === "razorpay"
      ? "https://api.srichaitanyaschool.net/v3/grievance-api/update-razorpay-tuition-payment-status"
      : "https://api.srichaitanyaschool.net/v3/grievance-api/update-cashfree-tuition-payment-status";

  try {
    const statusResults =
      provider === "razorpay"
        ? await Promise.all(ids.map((id) => checkRazorpayPaymentStatus(id)))
        : [];
    const successfulRazorpayOrderIds = statusResults
      .filter((result) => result.success)
      .map((result) => result.orderId);
    const failedStatusOrderIds = statusResults
      .filter((result) => !result.success)
      .map((result) => result.orderId);

    if (provider === "razorpay" && successfulRazorpayOrderIds.length === 0) {
      return NextResponse.json(
        {
          failedIds: failedStatusOrderIds,
          message: readFirstFailureMessage(
            statusResults,
            "No completed Razorpay payments found to update."
          ),
          results: statusResults,
          success: false
        },
        { status: 400 }
      );
    }

    const updateIds =
      provider === "razorpay" ? successfulRazorpayOrderIds : ids;
    const requestBody =
      provider === "razorpay"
        ? { order_ids: updateIds }
        : { transaction_ids: updateIds };
    const response =
      provider === "cashfree"
        ? await sendJsonRequest(url, "GET", requestBody)
        : await sendJsonRequest(url, "POST", requestBody);
    const payload = response.payload;
    const updateSuccess =
      typeof payload === "string"
        ? response.ok && !payload.toLowerCase().includes("fail")
        : response.ok && readSuccess(payload, response.ok);
    const failedIds =
      provider === "razorpay"
        ? [
            ...failedStatusOrderIds,
            ...(updateSuccess ? [] : successfulRazorpayOrderIds)
          ]
        : updateSuccess
          ? []
          : ids;
    const success = updateSuccess && failedIds.length === 0;
    const fallback = updateSuccess
      ? "Tuition payment status updated successfully."
      : "Tuition payment status update failed.";

    return NextResponse.json(
      {
        failedIds,
        message:
          typeof payload === "string" && payload.trim()
            ? payload
            : failedIds.length > 0 && updateSuccess
              ? `${successfulRazorpayOrderIds.length}/${ids.length} Razorpay order IDs updated. ${readFirstFailureMessage(
                  statusResults,
                  `${failedIds.length} failed payment status check.`
                )}`
              : readMessage(payload, fallback),
        results:
          provider === "razorpay"
            ? statusResults.map((result) => ({
                ...result,
                updated: result.success && updateSuccess
              }))
            : undefined,
        success
      },
      { status: success ? 200 : response.status >= 400 ? response.status : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to tuition payment API.", success: false },
      { status: 502 }
    );
  }
}
