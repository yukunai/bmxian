import { NextResponse } from "next/server";
import type { TeamMemberRole } from "@/lib/workbench-data";
import { readServerSession } from "@/lib/server/session";
import { getWorkspaceForClient } from "@/lib/server/store";

type WorkspacePermission = "editor" | "admin" | "owner";

const permissionRoles: Record<WorkspacePermission, TeamMemberRole[]> = {
  editor: ["owner", "admin", "editor"],
  admin: ["owner", "admin"],
  owner: ["owner"]
};

function roleLabel(role: WorkspacePermission) {
  if (role === "owner") return "所有者";
  if (role === "admin") return "管理员";
  return "编辑者";
}

function canTrustHeaderRole() {
  return process.env.BMXIAN_AUTH_TRUST_HEADER_ROLE === "true";
}

export async function requireWorkspaceRole(permission: WorkspacePermission) {
  const session = await readServerSession();

  if (!session.authenticated) {
    return {
      ok: false as const,
      response: NextResponse.json({
        error: "unauthorized",
        message: "当前请求没有通过生产认证网关。",
        authAdapter: session.authAdapter,
        authWarning: session.authWarning
      }, { status: 401 })
    };
  }

  const workspace = await getWorkspaceForClient();
  const member = workspace.teamMembers.find((item) => item.email === session.email);
  const role = member?.status === "active"
    ? member.role
    : session.email === workspace.ownerEmail
      ? "owner"
      : canTrustHeaderRole()
        ? session.role
        : undefined;
  const allowed = role ? permissionRoles[permission].includes(role) : false;

  if (allowed) return { ok: true as const, role, session, workspace };

  return {
    ok: false as const,
    response: NextResponse.json({
      error: "forbidden",
      message: `当前成员没有${roleLabel(permission)}权限。`,
      requiredRole: permission,
      currentRole: role ?? "none"
    }, { status: 403 })
  };
}
