import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

const RECEIPT_LIST_URL =
  "https://api.srichaitanyaschool.net/v3/grievance-api/payment-list";

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const body = (await request.json().catch(() => null)) as {
    admissionNo?: string;
  } | null;
  const admissionNo = body?.admissionNo?.trim() || "";

  if (!admissionNo) {
    return NextResponse.json(
      { message: "Please enter an admission number.", success: false },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${RECEIPT_LIST_URL}?admission_no=${encodeURIComponent(admissionNo)}`,
      {
        headers: {
          Accept: "application/json"
        },
        method: "GET"
      }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message || "Unable to fetch receipt list.")
              : "Unable to fetch receipt list.",
          success: false
        },
        { status: response.status }
      );
    }

    if (
      payload &&
      typeof payload === "object" &&
      "status" in payload &&
      payload.status === false
    ) {
      return NextResponse.json(
        {
          message:
            "message" in payload && typeof payload.message === "string"
              ? payload.message
              : "No receipt records found.",
          success: false
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: payload,
      message: "Receipt list fetched successfully.",
      success: true
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to receipt list API.", success: false },
      { status: 502 }
    );
  }
}
