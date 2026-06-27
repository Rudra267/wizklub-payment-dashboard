import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

const allowedTables = new Set([
  "payments",
  "exam_payments",
  "book_payments",
  "uniform_payments"
]);

function normalizeSearchValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim().replace(/^['"]+|['"]+$/g, ""))
        .filter(Boolean)
    )
  ).join(",");
}

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
    return unauthorizedDashboardResponse();
  }

  const table = request.nextUrl.searchParams.get("table")?.trim() || "";
  const rawSearch =
    request.nextUrl.searchParams.get("search")?.trim() ||
    request.nextUrl.searchParams.get("transactionId")?.trim() ||
    request.nextUrl.searchParams.get("transaction_id")?.trim() ||
    "";
  const search = normalizeSearchValues(rawSearch);

  if (!allowedTables.has(table)) {
    return NextResponse.json(
      { message: "Please select a valid transaction table.", success: false },
      { status: 400 }
    );
  }

  if (!search) {
    return NextResponse.json(
      { message: "Please enter a search value.", success: false },
      { status: 400 }
    );
  }

  const url = new URL(
    "https://api.srichaitanyaschool.net/v3/grievance-api/get-transaction-details"
  );
  url.searchParams.set("table", table);
  url.searchParams.set("search", search);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);
    const success =
      response.ok &&
      payload &&
      typeof payload === "object" &&
      "status" in payload &&
      Boolean((payload as { status: unknown }).status);

    return NextResponse.json(
      {
        data:
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : null,
        count:
          payload && typeof payload === "object" && "count" in payload
            ? (payload as { count: unknown }).count
            : undefined,
        message:
          payload && typeof payload === "object" && "message" in payload
            ? String((payload as { message: unknown }).message)
            : success
              ? "Transaction found."
              : "Transaction not found.",
        success
      },
      { status: success ? 200 : response.status >= 400 ? response.status : 404 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to transaction details API.", success: false },
      { status: 502 }
    );
  }
}
