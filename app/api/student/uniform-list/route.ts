import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

const STUDENT_DETAILS_URL =
  "https://api.srichaitanyaschool.net/v3/grievance-api/get-student-details";
const UNIFORM_LIST_URL = "https://api.srichaitanyaschool.net/v3/uniformsales/list";
const UNIFORM_LIST_ACCESS_TOKEN = "hKkYlSeucJqtE0Cjl4vQ38NYN6z5ZQj0";
const UNIFORM_LIST_AUTHORIZATION =
  "Basic NVJoVHhoQkpJZlRpTmNJaFpLd1RCSXp6QnlXQ1FtY2s6NVJoVHhoQkpJZlRpTmNJaFpLd1RCSXp6QnlXQ1FtY2s=";
const UNIFORM_LIST_COOKIE =
  "AWSALB=TK1MlxHsKsCJOu3fuwtm6cegRN5QiX0mbkct3PHlNImmsvoh2XvfCEVIcTQ4Uipgggjn7ULDHEkDFbUWUxL6MMCjAXMpP1SOuHJZnyi43b8sLQuVw5t8cU2nzyTt; AWSALBCORS=TK1MlxHsKsCJOu3fuwtm6cegRN5QiX0mbkct3PHlNImmsvoh2XvfCEVIcTQ4Uipgggjn7ULDHEkDFbUWUxL6MMCjAXMpP1SOuHJZnyi43b8sLQuVw5t8cU2nzyTt; _csrf=6643f357a716dee23395961ce7b02c91b3c2df834f9979ad236e4de3ae752de1a%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%22_TkQ4BHcjdbVsdmmvQhXerxgFbVr-DjF%22%3B%7D";
const UNIFORM_LIST_USER_ID = "1608043";
const UNIFORM_LIST_ACADEMIC_YEAR_ID = "181";

function readNestedValue(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nestedValue = readNestedValue(value, keys);

      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return "";
}

async function getStudentId(admissionNo: string) {
  const url = new URL(STUDENT_DETAILS_URL);
  url.searchParams.set("admission_no", admissionNo);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    method: "GET"
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error("Unable to fetch student details.");
  }

  const studentId = readNestedValue(payload, [
    "student_id",
    "studentId",
    "student_number",
    "student_no",
    "id"
  ]);

  if (!studentId) {
    throw new Error("Student ID not found for this admission number.");
  }

  return studentId;
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
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
    const studentId = await getStudentId(admissionNo);
    const formData = new FormData();
    formData.set("admission_no", admissionNo);
    formData.set("student_id", studentId);
    formData.set("academic_year_id", UNIFORM_LIST_ACADEMIC_YEAR_ID);
    formData.set("user_id", UNIFORM_LIST_USER_ID);

    const response = await fetch(UNIFORM_LIST_URL, {
      body: formData,
      headers: {
        Authorization: UNIFORM_LIST_AUTHORIZATION,
        Cookie: UNIFORM_LIST_COOKIE,
        "access-token": UNIFORM_LIST_ACCESS_TOKEN
      },
      method: "POST"
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message || "Unable to fetch uniform list.")
              : "Unable to fetch uniform list.",
          success: false
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      data: payload,
      message: "Uniform list fetched successfully.",
      studentId,
      success: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to connect to uniform list API.",
        success: false
      },
      { status: 502 }
    );
  }
}
