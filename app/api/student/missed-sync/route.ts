import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

function readStatus(payload: unknown, fallback: boolean) {
  if (payload && typeof payload === "object" && "status" in payload) {
    return Boolean((payload as { status: unknown }).status);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    return Boolean((payload as { success: unknown }).success);
  }

  return fallback;
}

function readMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    return String((payload as { message: unknown }).message || fallback);
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    admissionNo?: string;
  } | null;
  const admissionNo = body?.admissionNo?.trim();

  if (!admissionNo) {
    return NextResponse.json(
      { message: "Admission number is required.", success: false },
      { status: 400 }
    );
  }

  const syncUrl =
    process.env.MISSED_STUDENT_SYNC_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/sync-missed-students";

  try {
    const url = new URL(syncUrl);
    url.searchParams.set("admission_no", admissionNo);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);
    const success = response.ok && readStatus(payload, response.ok);

    return NextResponse.json(
      {
        admissionNo,
        data:
          payload && typeof payload === "object" && "data" in payload
            ? (payload as { data: unknown }).data
            : null,
        message: readMessage(
          payload,
          success ? "Missed Student Sync Completed" : "Missed student sync failed."
        ),
        raw: payload,
        success
      },
      { status: success ? 200 : response.status || 400 }
    );
  } catch {
    return NextResponse.json(
      {
        admissionNo,
        data: null,
        message: "Unable to connect to missed student sync API.",
        success: false
      },
      { status: 502 }
    );
  }
}
