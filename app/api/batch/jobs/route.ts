import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithGateway, providerHasRuntimeKey } from "@/lib/model-gateway";
import { providerConfigForModel } from "@/lib/gateway-types";
import type { GenerationTask, VisualGenerationSettings, WorkspaceMode } from "@/lib/workbench-data";
import { submitMediaGenerationJob, type MediaMode, type MediaProviderUpdate } from "@/lib/media-provider";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { addArtifact, getWorkspaceForRuntime, upsertTask } from "@/lib/server/store";
import { modelEngineSchema, productProfileSchema, routeSkillSchema, visualGenerationSettingsSchema, workspaceModeSchema } from "@/lib/server/schemas";

const mediaModes = new Set<WorkspaceMode>(["图片", "视频", "海报", "PPT"]);

const batchRequestSchema = z.object({
  prompts: z.array(z.string().min(1)).min(1).max(12),
  mode: workspaceModeSchema,
  product: productProfileSchema,
  skill: routeSkillSchema,
  model: modelEngineSchema,
  visualSettings: visualGenerationSettingsSchema.optional()
});

function createId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function estimateCost(mode: WorkspaceMode) {
  if (mode === "视频") return "预估 1.20 元";
  if (mode === "图片") return "预估 0.60 元";
  if (mode === "海报") return "预估 0.80 元";
  if (mode === "PPT") return "预估 0.30 元";
  return "预估 0.08 元";
}

function buildBatchTask(
  id: string,
  prompt: string,
  mode: WorkspaceMode,
  modelId: string,
  modelName: string,
  productName: string,
  skillName: string,
  visualSettings?: VisualGenerationSettings,
  providerUpdate?: MediaProviderUpdate
): GenerationTask {
  const now = new Date().toISOString();
  return {
    id,
    title: `${mode}批量：${prompt.slice(0, 16)}${prompt.length > 16 ? "..." : ""}`,
    type: mode,
    modelId,
    model: modelName,
    cost: providerUpdate?.cost ?? estimateCost(mode),
    status: "生成中",
    progress: providerUpdate?.progress ?? (mediaModes.has(mode) ? 25 : undefined),
    prompt,
    productName,
    skillName,
    visualSettings,
    providerId: providerUpdate?.providerId,
    providerLabel: providerUpdate?.providerLabel,
    providerStatus: providerUpdate?.providerStatus,
    externalJobId: providerUpdate?.externalJobId,
    providerWarning: providerUpdate?.warning,
    providerResultUrl: providerUpdate?.resultUrl,
    createdAt: now,
    updatedAt: now
  };
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = batchRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForRuntime();
  const provider = providerConfigForModel(parsed.data.model.id, workspace.providerConfigs, {
    routingPolicy: workspace.routingPolicy,
    hasCredential: providerHasRuntimeKey
  });
  const tasks: GenerationTask[] = [];
  const artifacts = [];

  for (const prompt of parsed.data.prompts) {
    if (mediaModes.has(parsed.data.mode)) {
      const id = createId("batch");
      const providerUpdate = await submitMediaGenerationJob(provider, {
        taskId: id,
        prompt,
        mode: parsed.data.mode as MediaMode,
        product: parsed.data.product,
        skill: parsed.data.skill,
        model: parsed.data.model,
        visualSettings: parsed.data.visualSettings,
        materials: workspace.materials.slice(0, 8)
      });
      const task = buildBatchTask(
        id,
        prompt,
        parsed.data.mode,
        parsed.data.model.id,
        parsed.data.model.name,
        parsed.data.product.name,
        parsed.data.skill.name,
        parsed.data.visualSettings,
        providerUpdate
      );
      const updated = await upsertTask(task);
      tasks.push(updated.tasks.find((item) => item.id === task.id) ?? task);
      continue;
    }

    const response = await generateWithGateway({
      prompt,
      mode: parsed.data.mode,
      product: parsed.data.product,
      skill: parsed.data.skill,
      model: parsed.data.model,
      provider,
      visualSettings: parsed.data.visualSettings,
      materials: workspace.materials.slice(0, 8)
    });
    await addArtifact(response.artifact, response.task, response.assistantMessage);
    tasks.push(response.task);
    artifacts.push(response.artifact);
  }

  return NextResponse.json({ tasks, artifacts }, { status: 202 });
}
