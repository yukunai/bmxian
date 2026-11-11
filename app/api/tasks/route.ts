import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema, generationTaskSchema } from "@/lib/server/schemas";
import { deleteTask, getWorkspaceForClient, upsertTask } from "@/lib/server/store";

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ tasks: workspace.tasks });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = generationTaskSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertTask(parsed.data);
  return NextResponse.json({ tasks: workspace.tasks }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = generationTaskSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertTask(parsed.data);
  return NextResponse.json({ tasks: workspace.tasks });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteTask(parsed.data.id);
  return NextResponse.json({ tasks: workspace.tasks });
}
