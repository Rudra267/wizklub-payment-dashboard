import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "wizklub_dashboard_auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 30;

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readConfiguredCredentials() {
  return {
    password: process.env.DASHBOARD_PASSWORD || "",
    username: process.env.DASHBOARD_USERNAME || ""
  };
}

function createAuthToken() {
  const { password, username } = readConfiguredCredentials();

  if (!password || !username) {
    return "";
  }

  return createHmac("sha256", password)
    .update(`${username}:wizklub-payment-dashboard`)
    .digest("hex");
}

export function verifyDashboardCredentials(username: string, password: string) {
  const credentials = readConfiguredCredentials();

  if (!credentials.username || !credentials.password) {
    return false;
  }

  return (
    safeCompare(username, credentials.username) &&
    safeCompare(password, credentials.password)
  );
}

export function isDashboardAuthenticated(request: NextRequest) {
  const expectedToken = createAuthToken();
  const providedToken = request.cookies.get(AUTH_COOKIE_NAME)?.value || "";

  if (!expectedToken || !providedToken) {
    return false;
  }

  return safeCompare(providedToken, expectedToken);
}

export function setDashboardAuthCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    name: AUTH_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: createAuthToken()
  });
}

export function clearDashboardAuthCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: AUTH_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: ""
  });
}

export function unauthorizedDashboardResponse() {
  return NextResponse.json(
    { message: "Please login to continue.", success: false },
    { status: 401 }
  );
}
