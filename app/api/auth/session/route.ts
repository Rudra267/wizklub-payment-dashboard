import { NextRequest, NextResponse } from "next/server";
import { isDashboardAuthenticated } from "../../auth-utils";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isDashboardAuthenticated(request) });
}
