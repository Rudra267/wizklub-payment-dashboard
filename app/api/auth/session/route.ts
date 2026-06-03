import { NextRequest, NextResponse } from "next/server";
import { getDashboardSession } from "../../auth-utils";

export async function GET(request: NextRequest) {
  const session = getDashboardSession(request);

  return NextResponse.json({
    authenticated: Boolean(session),
    role: session?.role || null
  });
}
