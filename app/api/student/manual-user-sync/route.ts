import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function readPayloadStatus(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (record.status && typeof record.status === "object") {
    return record.status as Record<string, unknown>;
  }

  return record;
}

function readPayloadMessage(payload: unknown, fallback: string) {
  const status = readPayloadStatus(payload);
  const message = status?.message;

  return typeof message === "string" && message.trim() ? message.trim() : fallback;
}

function readPayloadSuccess(payload: unknown, fallback: boolean) {
  const status = readPayloadStatus(payload);
  const value = status?.status ?? status?.success;

  return typeof value === "boolean" ? value : fallback;
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    employeeId?: string;
  } | null;
  const employeeId = body?.employeeId?.trim();

  if (!employeeId) {
    return NextResponse.json(
      { message: "Employee ID is required.", success: false },
      { status: 400 }
    );
  }

  const syncUrl =
    process.env.MANUAL_USER_SYNC_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/sync-manual-user";

  try {
    const url = new URL(syncUrl);
    url.searchParams.set("employee_id", employeeId);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);
    const success = response.ok && readPayloadSuccess(payload, response.ok);
    const message = readPayloadMessage(
      payload,
      success ? "User synced successfully." : "User sync failed."
    );

    return NextResponse.json(
      {
        employeeId,
        message,
        raw: payload,
        success
      },
      { status: success ? 200 : response.status || 400 }
    );
  } catch {
    return NextResponse.json(
      {
        employeeId,
        message: "Unable to connect to manual user sync API.",
        success: false
      },
      { status: 502 }
    );
  }
}
