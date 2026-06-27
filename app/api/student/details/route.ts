import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const admissionNo = request.nextUrl.searchParams.get("admissionNo")?.trim() || "";

  if (!admissionNo) {
    return NextResponse.json(
      { message: "Please enter an admission number.", success: false },
      { status: 400 }
    );
  }

  const url = new URL(
    "https://api.srichaitanyaschool.net/v3/grievance-api/get-student-details"
  );
  url.searchParams.set("admission_no", admissionNo);

  try {
    const response = await fetch(url, {
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
              : "Unable to fetch student details.",
          success: false
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      data: payload,
      message: "Student details fetched successfully.",
      success: true
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to student details API.", success: false },
      { status: 502 }
    );
  }
}
