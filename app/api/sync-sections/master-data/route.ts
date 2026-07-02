import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

const allowedMasterDataTypes = new Set([
  "states",
  "cities",
  "entity",
  "zones",
  "boards",
  "schools",
  "academic_year",
  "academics",
  "school_classes",
  "orientations",
  "student_type",
  "gender"
]);

function readPayloadValue(
  payload: unknown,
  key: "data" | "message" | "type",
  fallback = ""
) {
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

  const body = (await request.json().catch(() => null)) as { type?: string } | null;
  const type = body?.type?.trim();

  if (!type || !allowedMasterDataTypes.has(type)) {
    return NextResponse.json(
      { message: "Valid master data type is required.", success: false },
      { status: 400 }
    );
  }

  const syncUrl =
    process.env.MASTER_DATA_SYNC_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/sync-master-data";

  try {
    const url = new URL(syncUrl);
    url.searchParams.set("type", type);

    const response = await fetch(url, {
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
          success ? "Master data sync completed successfully." : "Master data sync failed."
        ),
        raw: payload,
        success,
        type: readPayloadValue(payload, "type", type)
      },
      { status: success ? 200 : response.status || 400 }
    );
  } catch {
    return NextResponse.json(
      {
        data: "",
        message: "Unable to connect to master data sync API.",
        success: false,
        type
      },
      { status: 502 }
    );
  }
}
