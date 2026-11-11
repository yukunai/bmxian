import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import type { TeamMemberRole } from "@/lib/workbench-data";

export const USER_EMAIL_COOKIE = "bmxian_user_email";
export const USER_NAME_COOKIE = "bmxian_user_name";
export const ACTIVE_WORKSPACE_COOKIE = "bmxian_workspace_id";

export type AuthAdapterId = "local" | "trusted-headers";
export type SessionSource = "local-cookie" | "trusted-headers" | "default";

export type ServerSession = {
  email: string;
  name: string;
  workspaceId?: string;
  role?: TeamMemberRole;
  source: SessionSource;
  authAdapter: AuthAdapterId;
  authenticated: boolean;
  authWarning?: string;
};

export const defaultSessionUser = {
  email: "owner@bmxian.local",
  name: "斑马线团队"
};

function authAdapterId(): AuthAdapterId {
  const requested = (process.env.BMXIAN_AUTH_ADAPTER ?? "local").trim();
  return requested === "trusted-headers" ? "trusted-headers" : "local";
}

function trustedHeaderSecret() {
  return process.env.BMXIAN_AUTH_PROXY_SECRET?.trim();
}

function parseRole(role: string | null): TeamMemberRole | undefined {
  if (role === "owner" || role === "admin" || role === "editor" || role === "viewer") return role;
  return undefined;
}

function defaultSession(
  authAdapter: AuthAdapterId,
  source: SessionSource,
  authenticated: boolean,
  authWarning?: string
): ServerSession {
  return {
    ...defaultSessionUser,
    workspaceId: undefined,
    source,
    authAdapter,
    authenticated,
    authWarning
  };
}

async function readTrustedHeaderSession(): Promise<ServerSession> {
  const secret = trustedHeaderSecret();
  const headerStore = await headers();
  const providedSecret = headerStore.get("x-bmxian-auth-secret")?.trim();
  const email = headerStore.get("x-bmxian-user-email")?.trim();
  const name = headerStore.get("x-bmxian-user-name")?.trim();
  const workspaceId = headerStore.get("x-bmxian-workspace-id")?.trim();
  const role = parseRole(headerStore.get("x-bmxian-user-role"));

  if (!secret) {
    return defaultSession(
      "trusted-headers",
      "trusted-headers",
      false,
      "BMXIAN_AUTH_ADAPTER=trusted-headers requires BMXIAN_AUTH_PROXY_SECRET."
    );
  }

  if (!providedSecret || providedSecret !== secret) {
    return defaultSession("trusted-headers", "trusted-headers", false, "Trusted auth header secret is missing or invalid.");
  }

  if (!email) {
    return defaultSession("trusted-headers", "trusted-headers", false, "Trusted auth headers did not include x-bmxian-user-email.");
  }

  return {
    email,
    name: name || email.split("@")[0] || defaultSessionUser.name,
    workspaceId,
    role,
    source: "trusted-headers",
    authAdapter: "trusted-headers",
    authenticated: true
  };
}

export function authAdapterInfo() {
  const adapter = authAdapterId();
  const secretConfigured = Boolean(trustedHeaderSecret());

  return {
    adapter,
    source: adapter === "trusted-headers" ? "trusted-headers" : "local-cookie",
    productionReady: adapter === "trusted-headers" && secretConfigured,
    trustedHeaders: adapter === "trusted-headers"
      ? ["x-bmxian-user-email", "x-bmxian-user-name", "x-bmxian-user-role", "x-bmxian-workspace-id"]
      : [],
    requiredEnv: adapter === "trusted-headers" ? ["BMXIAN_AUTH_PROXY_SECRET"] : [],
    missingEnv: adapter === "trusted-headers" && !secretConfigured ? ["BMXIAN_AUTH_PROXY_SECRET"] : [],
    note: adapter === "trusted-headers"
      ? "Trusts identity headers from a reverse proxy or SSO gateway after x-bmxian-auth-secret validation."
      : "Uses local MVP cookies for single-machine development."
  };
}

export async function readServerSession(): Promise<ServerSession> {
  const adapter = authAdapterId();

  if (adapter === "trusted-headers") {
    try {
      return await readTrustedHeaderSession();
    } catch {
      return defaultSession("trusted-headers", "trusted-headers", false, "Could not read trusted auth headers.");
    }
  }

  try {
    const cookieStore = await cookies();
    return {
      email: cookieStore.get(USER_EMAIL_COOKIE)?.value || defaultSessionUser.email,
      name: cookieStore.get(USER_NAME_COOKIE)?.value || defaultSessionUser.name,
      workspaceId: cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value,
      source: "local-cookie",
      authAdapter: "local",
      authenticated: true
    };
  } catch {
    return defaultSession("local", "default", true);
  }
}

export function writeSessionCookies(
  response: NextResponse,
  session: { email?: string; name?: string; workspaceId?: string }
) {
  if (authAdapterId() === "trusted-headers") return;

  const cookieOptions = {
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  };

  if (session.email) response.cookies.set(USER_EMAIL_COOKIE, session.email, cookieOptions);
  if (session.name) response.cookies.set(USER_NAME_COOKIE, session.name, cookieOptions);
  if (session.workspaceId) response.cookies.set(ACTIVE_WORKSPACE_COOKIE, session.workspaceId, cookieOptions);
}
