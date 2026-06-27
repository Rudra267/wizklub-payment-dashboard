import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "wizklub_dashboard_auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 30;

export type DashboardRole = "admin" | "uniform" | "wizklub";

type DashboardCredentials = {
  password: string;
  role: DashboardRole;
  username: string;
};

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeEnvCredential(value: string) {
  const trimmedValue = value.trim();
  const withoutWrappingQuotes = trimmedValue.replace(/^["'](.+)["']$/, "$1");

  return withoutWrappingQuotes.replace(/\\\$/g, "$");
}

function readConfiguredCredentials(): DashboardCredentials[] {
  const credentials: DashboardCredentials[] = [
    {
      password: normalizeEnvCredential(process.env.ADMIN_PASSWORD || ""),
      role: "admin",
      username: normalizeEnvCredential(process.env.ADMIN_USERNAME || "")
    },
    {
      password: normalizeEnvCredential(process.env.WIZKLUB_PASSWORD || ""),
      role: "wizklub",
      username: normalizeEnvCredential(process.env.WIZKLUB_USERNAME || "")
    }
  ];

  return credentials.filter((item) => item.username && item.password);
}

function getCredentialsForRole(role: DashboardRole) {
  return readConfiguredCredentials().find((credentials) => credentials.role === role);
}

function createAuthSignature(role: DashboardRole) {
  const credentials = getCredentialsForRole(role);

  if (!credentials) {
    return "";
  }

  return createHmac("sha256", credentials.password)
    .update(`${credentials.username}:${role}:wizklub-payment-dashboard`)
    .digest("hex");
}

export function verifyDashboardCredentials(username: string, password: string) {
  const normalizedUsername = normalizeEnvCredential(username).toUpperCase();
  const normalizedPassword = password.replace(/\\\$/g, "$");

  for (const credentials of readConfiguredCredentials()) {
    if (
      safeCompare(normalizedUsername, credentials.username.toUpperCase()) &&
      safeCompare(normalizedPassword, credentials.password)
    ) {
      return credentials.role;
    }
  }

  return null;
}

export function getDashboardSession(request: NextRequest) {
  const providedToken = request.cookies.get(AUTH_COOKIE_NAME)?.value || "";
  const [providedRole, signature] = providedToken.split(".");

  if (
    providedRole !== "admin" &&
    providedRole !== "uniform" &&
    providedRole !== "wizklub"
  ) {
    return null;
  }

  const role: DashboardRole = providedRole;
  const expectedSignature = createAuthSignature(role);

  if (!expectedSignature || !signature) {
    return null;
  }

  return safeCompare(signature, expectedSignature) ? { role } : null;
}

export function isDashboardAuthenticated(request: NextRequest) {
  return Boolean(getDashboardSession(request));
}

export function hasDashboardRole(request: NextRequest, allowedRoles: DashboardRole[]) {
  const session = getDashboardSession(request);

  return Boolean(session && allowedRoles.includes(session.role));
}

export function setDashboardAuthCookie(response: NextResponse, role: DashboardRole) {
  response.cookies.set({
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    name: AUTH_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: `${role}.${createAuthSignature(role)}`
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
