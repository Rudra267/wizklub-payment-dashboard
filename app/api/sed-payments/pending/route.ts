import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function extractPendingTransactions(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const records = (payload as { data?: unknown }).data;

  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter(
    (transactionId): transactionId is string =>
      typeof transactionId === "string" && transactionId.startsWith("ORDS-KIT")
  );
}

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
    return unauthorizedDashboardResponse();
  }

  const pendingSedUrl =
    process.env.PENDING_SED_TRANSACTIONS_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/pending-sed-transactions";

  try {
    const response = await fetch(pendingSedUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            payload && typeof payload.message === "string"
              ? payload.message
              : "Unable to fetch pending SED transactions.",
          success: false
        },
        { status: response.status }
      );
    }

    const apiStatus =
      payload && typeof payload === "object" && "status" in payload
        ? Boolean((payload as { status: unknown }).status)
        : true;
    const data = apiStatus ? extractPendingTransactions(payload) : [];

    return NextResponse.json(
      {
        count: data.length,
        data,
        message:
          payload && typeof payload.message === "string"
            ? payload.message
            : "Pending SED transactions loaded.",
        success: apiStatus
      },
      { status: apiStatus ? 200 : 404 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to pending SED transactions API.", success: false },
      { status: 502 }
    );
  }
}
