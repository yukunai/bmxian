import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema, routeSkillSchema } from "@/lib/server/schemas";
import { deleteSkill, getWorkspaceForClient, upsertSkill } from "@/lib/server/store";

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ skills: workspace.skills });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = routeSkillSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertSkill(parsed.data);
  return NextResponse.json({ skills: workspace.skills }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = routeSkillSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertSkill(parsed.data);
  return NextResponse.json({ skills: workspace.skills });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteSkill(parsed.data.id);
  return NextResponse.json({ skills: workspace.skills });
}
