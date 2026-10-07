import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

type PendingCategory = "admission" | "exam" | "uniform" | "tuition" | "book";

const pendingEndpointByCategory: Record<PendingCategory, string> = {
  admission:
    "https://api.srichaitanyaschool.net/v3/grievance-api/pending-razorpay-admission-payments",
  book:
    "https://api.srichaitanyaschool.net/v3/grievance-api/pending-razorpay-book-payments",
  exam:
    "https://api.srichaitanyaschool.net/v3/grievance-api/pending-razorpay-exam-payments",
  tuition:
    "https://api.srichaitanyaschool.net/v3/grievance-api/pending-razorpay-tuition-payments",
  uniform:
    "https://api.srichaitanyaschool.net/v3/grievance-api/pending-razorpay-uniform-payments"
};

function isPendingCategory(value: unknown): value is PendingCategory {
  return (
    value === "admission" ||
    value === "exam" ||
    value === "uniform" ||
    value === "tuition" ||
    value === "book"
  );
}

function readPendingIds(payload: unknown, category: PendingCategory) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === "object" ? root.data : root;
  const dataRecord = data as Record<string, unknown>;
  const idField = category === "tuition" ? "order_ids" : "transaction_ids";
  const ids = dataRecord[idField];

  if (!Array.isArray(ids)) {
    return null;
  }

  return ids
    .map((id) => (typeof id === "string" || typeof id === "number" ? String(id).trim() : ""))
    .filter(Boolean);
}

function readApiStatus(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const status = (payload as Record<string, unknown>).status;

  if (typeof status === "boolean") {
    return status;
  }

  if (typeof status === "number") {
    return status >= 200 && status < 300;
  }

  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();

    return normalized === "true" || normalized === "success" || normalized === "200";
  }

  return true;
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    category?: unknown;
    end_time?: unknown;
    start_time?: unknown;
  } | null;

  if (
    !isPendingCategory(body?.category) ||
    typeof body?.start_time !== "string" ||
    typeof body?.end_time !== "string"
  ) {
    return NextResponse.json(
      { message: "Please provide category, start_time and end_time.", success: false },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(pendingEndpointByCategory[body.category], {
      body: JSON.stringify({
        end_time: body.end_time,
        start_time: body.start_time
      }),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const headers = new Headers();
      const retryAfter = response.headers.get("Retry-After");

      if (retryAfter) {
        headers.set("Retry-After", retryAfter);
      }

      return NextResponse.json(
        {
          message:
            payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : "Unable to fetch pending transactions.",
          success: false
        },
        { headers, status: response.status }
      );
    }

    const success = readApiStatus(payload);
    const ids = success ? readPendingIds(payload, body.category) : null;

    if (!success || !ids) {
      return NextResponse.json(
        {
          count: 0,
          ids: [],
          message: "Pending transaction API returned an invalid response.",
          success: false
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      count: ids.length,
      idField: body.category === "tuition" ? "order_ids" : "transaction_ids",
      ids,
      message: ids.length ? "Pending transactions loaded." : "No pending transactions found",
      success: true
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to pending transactions API.", success: false },
      { status: 502 }
    );
  }
}
