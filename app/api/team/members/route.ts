import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema, teamMemberRoleSchema } from "@/lib/server/schemas";
import { deleteTeamMember, getWorkspaceForClient, upsertTeamMember } from "@/lib/server/store";

const teamMemberUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  role: teamMemberRoleSchema.default("editor"),
  status: z.enum(["active", "invited", "disabled"]).default("invited")
});

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ members: workspace.teamMembers });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = teamMemberUpsertSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertTeamMember(parsed.data);
  return NextResponse.json({ members: workspace.teamMembers }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = teamMemberUpsertSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertTeamMember(parsed.data);
  return NextResponse.json({ members: workspace.teamMembers });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteTeamMember(parsed.data.id);
  return NextResponse.json({ members: workspace.teamMembers });
}
