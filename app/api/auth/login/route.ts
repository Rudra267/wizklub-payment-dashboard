import { NextRequest, NextResponse } from "next/server";
import { setDashboardAuthCookie, verifyDashboardCredentials } from "../../auth-utils";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
    username?: string;
  } | null;

  const username = body?.username?.trim() || "";
  const password = body?.password || "";

  const role = verifyDashboardCredentials(username, password);

  if (!role) {
    return NextResponse.json(
      { message: "Invalid username or password.", success: false },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ role, success: true });
  setDashboardAuthCookie(response, role);

  return response;
}
