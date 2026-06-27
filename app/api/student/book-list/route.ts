import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../../auth-utils";

const BOOK_LIST_URL = "https://api.srichaitanyaschool.net/v3/booksales/list";
const BOOK_LIST_ACCESS_TOKEN = "hKkYlSeucJqtE0Cjl4vQ38NYN6z5ZQj0";
const BOOK_LIST_AUTHORIZATION =
  "Basic NVJoVHhoQkpJZlRpTmNJaFpLd1RCSXp6QnlXQ1FtY2s6NVJoVHhoQkpJZlRpTmNJaFpLd1RCSXp6QnlXQ1FtY2s=";
const BOOK_LIST_COOKIE =
  "AWSALB=kPC+U+BxVqjAqiYmrMumeDZ+qF6X/2lndyGtjF+EnMuk3w9gLgGUFMgh3LvUQSMvKb5YEN43rwW2tGsmmOhrG0IvGCIxlHzWSBwzwvX8wOLy1SxL47Tp1D8UQGsN; AWSALBCORS=kPC+U+BxVqjAqiYmrMumeDZ+qF6X/2lndyGtjF+EnMuk3w9gLgGUFMgh3LvUQSMvKb5YEN43rwW2tGsmmOhrG0IvGCIxlHzWSBwzwvX8wOLy1SxL47Tp1D8UQGsN; PHPSESSID=8q03rfu0q5vgdvcgqknlmdrth6; _csrf=b1224a35706b8950335a68b5bda9867a630e4bd0d1a51445c04b3ce785b4a2bda%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%22DyK6GkKV6loedTG4I6ECu75kMgkPELRK%22%3B%7D; AWSALB=WIA73jSGjiI+uZ77YzVGGoebewdEzKtcBOIH1nza+jCqUNehrrKx+S08DWKweoY1yIN/KAJ+UZmVm5C8lL8Gi2tyJPlG1ldtNYBg/1rK/e3Vpj8O9k60IjShuyug; AWSALBCORS=WIA73jSGjiI+uZ77YzVGGoebewdEzKtcBOIH1nza+jCqUNehrrKx+S08DWKweoY1yIN/KAJ+UZmVm5C8lL8Gi2tyJPlG1ldtNYBg/1rK/e3Vpj8O9k60IjShuyug; _csrf=15cc95a910af3aa00bbffb568855516069cf50165560868994f4c1d2eabddebca%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%22rm7EBxEagcj0XjONXi9kSDEz4-FI4qb-%22%3B%7D";
const BOOK_LIST_USER_ID = "1608043";
const BOOK_LIST_ACADEMIC_YEAR_ID = "181";

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

  const formData = new FormData();
  formData.set("user_id", BOOK_LIST_USER_ID);
  formData.set("admission_no", admissionNo);
  formData.set("academic_year_id", BOOK_LIST_ACADEMIC_YEAR_ID);

  try {
    const response = await fetch(BOOK_LIST_URL, {
      body: formData,
      headers: {
        Authorization: BOOK_LIST_AUTHORIZATION,
        Cookie: BOOK_LIST_COOKIE,
        "access-token": BOOK_LIST_ACCESS_TOKEN
      },
      method: "POST"
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message || "Unable to fetch book list.")
              : "Unable to fetch book list.",
          success: false
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      data: payload,
      message: "Book list fetched successfully.",
      success: true
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to book list API.", success: false },
      { status: 502 }
    );
  }
}
