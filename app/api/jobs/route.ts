import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { GenerationTask } from "@/lib/workbench-data";
import { providerConfigForModel } from "@/lib/gateway-types";
import { pollMediaGenerationJob, submitMediaGenerationJob, type MediaMode, type MediaProviderUpdate } from "@/lib/media-provider";
import { buildGenerationArtifact, buildGenerationAssistantMessage } from "@/lib/server/generation-job-artifacts";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { completeGenerationJob, getWorkspaceForClient, getWorkspaceForRuntime, upsertTask } from "@/lib/server/store";
import { materialAssetSchema, modelEngineSchema, productProfileSchema, routeSkillSchema, visualGenerationSettingsSchema } from "@/lib/server/schemas";

const mediaModes = ["图片", "视频", "海报", "PPT"] as const;
const mediaModeSchema = z.enum(mediaModes);

const createJobSchema = z.object({
  prompt: z.string().min(1),
  mode: mediaModeSchema,
  product: productProfileSchema,
  skill: routeSkillSchema,
  model: modelEngineSchema,
  visualSettings: visualGenerationSettingsSchema.optional(),
  materials: z.array(materialAssetSchema).optional()
});

function createId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function costForMode(mode: z.infer<typeof mediaModeSchema>) {
  if (mode === "视频") return "预估 1.20 元";
  if (mode === "图片") return "预估 0.60 元";
  if (mode === "海报") return "预估 0.80 元";
  return "预估 0.30 元";
}

function titleForMode(mode: z.infer<typeof mediaModeSchema>, prompt: string) {
  return `${mode}任务：${prompt.slice(0, 16)}${prompt.length > 16 ? "..." : ""}`;
}

function isCompletableMediaTask(task: GenerationTask) {
  return task.status === "生成中" && mediaModes.some((mode) => mode === task.type);
}

function mediaModeForTask(task: GenerationTask): MediaMode | undefined {
  return mediaModes.find((mode) => mode === task.type);
}

function isOverdue(task: GenerationTask) {
  const createdAt = Date.parse(task.createdAt ?? task.updatedAt ?? new Date().toISOString());
  return Date.now() - createdAt >= 900;
}

async function completeTask(task: GenerationTask) {
  const artifact = buildGenerationArtifact(task);
  const assistantMessage = buildGenerationAssistantMessage(task, artifact);
  const completedWorkspace = await completeGenerationJob(task.id, artifact, assistantMessage);
  const completedTask = completedWorkspace.tasks.find((item) => item.id === task.id) ?? task;

  return { completedWorkspace, completedTask, artifact, assistantMessage };
}

function applyProviderUpdate(task: GenerationTask, update: MediaProviderUpdate): GenerationTask {
  return {
    ...task,
    providerId: update.providerId,
    providerLabel: update.providerLabel,
    providerStatus: update.providerStatus,
    externalJobId: update.externalJobId ?? task.externalJobId,
    providerWarning: update.warning ?? task.providerWarning,
    providerResultUrl: update.resultUrl ?? task.providerResultUrl,
    cost: update.cost ?? task.cost,
    progress: update.progress ?? task.progress,
    updatedAt: new Date().toISOString()
  };
}

async function refreshProviderTask(task: GenerationTask) {
  const mode = mediaModeForTask(task);
  if (!mode || !task.providerId || !task.externalJobId) return task;
  if (!["submitted", "processing"].includes(task.providerStatus ?? "")) return task;

  const workspace = await getWorkspaceForRuntime();
  const provider = workspace.providerConfigs.find((config) => config.id === task.providerId)
    ?? providerConfigForModel(task.modelId ?? "", workspace.providerConfigs);
  const update = await pollMediaGenerationJob(provider, mode, task.id, task.externalJobId);
  const nextTask = applyProviderUpdate(task, update);
  const updatedWorkspace = await upsertTask(nextTask);

  return updatedWorkspace.tasks.find((item) => item.id === task.id) ?? nextTask;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const workspace = await getWorkspaceForClient();

  if (!id) {
    let currentWorkspace = workspace;
    for (const task of workspace.tasks) {
      if (isCompletableMediaTask(task) && isOverdue(task)) {
        const result = await completeTask(task);
        currentWorkspace = result.completedWorkspace;
      }
    }

    return NextResponse.json({ tasks: currentWorkspace.tasks });
  }

  const foundTask = workspace.tasks.find((item) => item.id === id);
  if (!foundTask) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  let task = foundTask;

  if (task.status === "已完成" && task.artifactId) {
    const artifact = workspace.artifacts.find((item) => item.id === task.artifactId);
    return NextResponse.json({ task, artifact, assistantMessage: artifact ? buildGenerationAssistantMessage(task, artifact) : undefined });
  }

  task = await refreshProviderTask(task);

  if (task.providerStatus === "failed") {
    const failedTask = {
      ...task,
      status: "失败" as const,
      progress: 0,
      updatedAt: new Date().toISOString()
    };
    const updatedWorkspace = await upsertTask(failedTask);
    return NextResponse.json({ task: updatedWorkspace.tasks.find((item) => item.id === id) ?? failedTask });
  }

  if (task.providerStatus === "completed") {
    const result = await completeTask(task);
    return NextResponse.json({
      task: result.completedTask,
      artifact: result.artifact,
      assistantMessage: result.assistantMessage
    });
  }

  if (!isOverdue(task)) {
    const createdAt = Date.parse(task.createdAt ?? task.updatedAt ?? new Date().toISOString());
    const ageMs = Date.now() - createdAt;
    const progress = Math.min(85, Math.max(task.progress ?? 25, Math.floor(ageMs / 12) + 25));
    const updatedWorkspace = await upsertTask({
      ...task,
      status: "生成中",
      progress,
      updatedAt: new Date().toISOString()
    });
    return NextResponse.json({ task: updatedWorkspace.tasks.find((item) => item.id === id) ?? task });
  }

  const result = await completeTask(task);
  return NextResponse.json({
    task: result.completedTask,
    artifact: result.artifact,
    assistantMessage: result.assistantMessage
  });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => undefined);
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForRuntime();
  const provider = providerConfigForModel(parsed.data.model.id, workspace.providerConfigs);
  const now = new Date().toISOString();
  const id = createId("job");
  const providerUpdate = await submitMediaGenerationJob(provider, {
    taskId: id,
    prompt: parsed.data.prompt,
    mode: parsed.data.mode,
    product: parsed.data.product,
    skill: parsed.data.skill,
    model: parsed.data.model,
    visualSettings: parsed.data.visualSettings,
    materials: parsed.data.materials
  });
  const task: GenerationTask = {
    id,
    title: titleForMode(parsed.data.mode, parsed.data.prompt),
    type: parsed.data.mode,
    modelId: parsed.data.model.id,
    model: parsed.data.model.name,
    cost: providerUpdate.cost ?? costForMode(parsed.data.mode),
    status: "生成中",
    progress: providerUpdate.progress ?? 25,
    prompt: parsed.data.prompt,
    productName: parsed.data.product.name,
    skillName: parsed.data.skill.name,
    visualSettings: parsed.data.visualSettings,
    providerId: providerUpdate.providerId,
    providerLabel: providerUpdate.providerLabel,
    providerStatus: providerUpdate.providerStatus,
    externalJobId: providerUpdate.externalJobId,
    providerWarning: providerUpdate.warning,
    providerResultUrl: providerUpdate.resultUrl,
    createdAt: now,
    updatedAt: now
  };

  const updatedWorkspace = await upsertTask(task);
  return NextResponse.json({ task: updatedWorkspace.tasks.find((item) => item.id === task.id) ?? task }, { status: 202 });
}
