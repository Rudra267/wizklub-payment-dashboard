import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const syncUrl =
    process.env.TABLE_USER_SYNC_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/sync-table-users";

  try {
    const response = await fetch(syncUrl, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);
    const success =
      response.ok &&
      Boolean(
        payload &&
          typeof payload === "object" &&
          "status" in payload &&
          (payload as { status: unknown }).status
      );

    return NextResponse.json(
      {
        data:
          payload && typeof payload === "object" && "data" in payload
            ? String((payload as { data: unknown }).data || "")
            : "",
        message:
          payload && typeof payload === "object" && "message" in payload
            ? String((payload as { message: unknown }).message || "")
            : success
              ? "Users sync completed."
              : "Users sync failed.",
        raw: payload,
        success
      },
      { status: success ? 200 : response.status || 400 }
    );
  } catch {
    return NextResponse.json(
      {
        data: "",
        message: "Unable to connect to table user sync API.",
        success: false
      },
      { status: 502 }
    );
  }
}
