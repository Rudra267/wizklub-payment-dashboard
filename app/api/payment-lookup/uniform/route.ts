import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function readSuccess(payload: unknown, responseOk: boolean) {
  if (!payload || typeof payload !== "object") {
    return responseOk;
  }

  const objectPayload = payload as {
    data?: unknown;
    isSuccess?: unknown;
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

async function checkUniformPayment(transactionId: string) {
  const url = new URL(
    "https://srichaitanyaschool.net/uniform-payments/check-uniform-sales-payment-razorpay"
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
    ? "Uniform receipt fetched successfully."
    : "Uniform receipt lookup failed.";

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
    const results = await Promise.all(ids.map((id) => checkUniformPayment(id)));
    const successCount = results.filter((result) => result.success).length;
    const success = successCount === results.length;

    return NextResponse.json(
      {
        message:
          results.length === 1
            ? results[0]?.message || "Uniform receipt lookup completed."
            : `${successCount}/${results.length} uniform receipt lookup${
                results.length === 1 ? "" : "s"
              } successful.`,
        results,
        success
      },
      { status: success ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to uniform payment API.", success: false },
      { status: 502 }
    );
  }
}
