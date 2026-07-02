import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function readPayloadValue(payload: unknown, key: "data" | "message", fallback = "") {
  if (payload && typeof payload === "object" && key in payload) {
    return String((payload as Record<typeof key, unknown>)[key] || fallback);
  }

  return fallback;
}

function readPayloadStatus(payload: unknown, fallback: boolean) {
  if (payload && typeof payload === "object" && "status" in payload) {
    return Boolean((payload as { status: unknown }).status);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    return Boolean((payload as { success: unknown }).success);
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const syncUrl =
    process.env.BRANCH_WISE_ORIENTATION_SYNC_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/sync-branch-wise-orientations";

  try {
    const response = await fetch(syncUrl, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);
    const success = response.ok && readPayloadStatus(payload, response.ok);

    return NextResponse.json(
      {
        data: readPayloadValue(payload, "data"),
        message: readPayloadValue(
          payload,
          "message",
          success
            ? "Branch wise orientations sync completed successfully."
            : "Branch wise orientations sync failed."
        ),
        raw: payload,
        success
      },
      { status: success ? 200 : response.status || 400 }
    );
  } catch {
    return NextResponse.json(
      {
        data: "",
        message: "Unable to connect to branch wise orientation sync API.",
        success: false
      },
      { status: 502 }
    );
  }
}
