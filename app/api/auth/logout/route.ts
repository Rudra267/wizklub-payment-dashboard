import { NextResponse } from "next/server";
import { clearDashboardAuthCookie } from "../../auth-utils";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearDashboardAuthCookie(response);

  return response;
}
