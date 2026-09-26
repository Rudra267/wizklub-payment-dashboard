import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

const allowedAcademicYearIds = new Set([18, 19]);

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
    const body = (await request.json().catch(() => null)) as {
      academic_year_id?: number | string;
    } | null;
    const academicYearId = Number(body?.academic_year_id);

    if (!allowedAcademicYearIds.has(academicYearId)) {
      return NextResponse.json(
        {
          message: "Valid academic year is required.",
          success: false
        },
        { status: 400 }
      );
    }

    const response = await fetch(syncUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ academic_year_id: academicYearId }),
      method: "POST"
    });
    const payload = await response.json().catch(() => null);
    const success = response.ok && readPayloadStatus(payload, response.ok);
    const message = readPayloadValue(
      payload,
      "message",
      success
        ? "Branch wise orientations sync completed successfully."
        : "Branch wise orientations sync failed."
    );

    return NextResponse.json(
      {
        academic_year_id: academicYearId,
        data: readPayloadValue(payload, "data", message),
        message,
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
