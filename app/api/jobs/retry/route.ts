import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema } from "@/lib/server/schemas";
import { getWorkspaceForClient, upsertTask } from "@/lib/server/store";

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const task = workspace.tasks.find((item) => item.id === parsed.data.id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (!task.prompt) {
    return NextResponse.json({ error: "Task has no prompt and cannot be retried" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const retried = {
    ...task,
    status: "生成中" as const,
    progress: 25,
    artifactId: undefined,
    providerId: undefined,
    providerLabel: undefined,
    providerStatus: undefined,
    externalJobId: undefined,
    providerWarning: undefined,
    providerResultUrl: undefined,
    updatedAt: now,
    createdAt: now
  };

  const updated = await upsertTask(retried);
  return NextResponse.json({ task: updated.tasks.find((item) => item.id === task.id) ?? retried });
}
