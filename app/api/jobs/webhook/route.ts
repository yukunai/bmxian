import { NextResponse } from "next/server";
import { z } from "zod";
import type { GenerationTask } from "@/lib/workbench-data";
import { buildGenerationArtifact, buildGenerationAssistantMessage } from "@/lib/server/generation-job-artifacts";
import { persistMediaResult, type MediaResultStorage } from "@/lib/server/media-result-storage";
import { completeGenerationJob, getWorkspaceForClient, upsertTask, type WorkspaceSnapshot } from "@/lib/server/store";
import { classifyProviderError, verifyWebhookSignature, type WebhookSignatureVerification } from "@/lib/media-provider-security";

const webhookSchema = z.object({
  taskId: z.string().min(1).optional(),
  externalJobId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
  providerLabel: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  resultUrl: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  warning: z.string().min(1).optional(),
  progress: z.number().min(0).max(100).optional(),
  cost: z.string().min(1).optional()
}).passthrough().refine((data) => data.taskId || data.externalJobId, {
  message: "taskId or externalJobId is required",
  path: ["taskId"]
});

type WebhookInput = z.infer<typeof webhookSchema>;
type WebhookStatus = "submitted" | "processing" | "completed" | "failed";

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function normalizeWebhookPayload(input: unknown) {
  const record = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
    ? record.metadata as Record<string, unknown>
    : {};
  return {
    ...record,
    taskId: firstString(record, ["taskId", "task_id"]) ?? firstString(metadata, ["taskId", "task_id"]),
    externalJobId: firstString(record, ["externalJobId", "external_job_id", "job_id", "request_id", "id"]),
    providerId: firstString(record, ["providerId", "provider_id"]),
    providerLabel: firstString(record, ["providerLabel", "provider_label", "provider_name"]),
    status: firstString(record, ["status", "state", "job_status", "task_status"]),
    resultUrl: firstString(record, ["resultUrl", "result_url", "output_url", "asset_url", "download_url", "url"]),
    error: firstString(record, ["error", "error_message", "message"]),
    warning: firstString(record, ["warning", "warn"]),
    progress: firstNumber(record, ["progress", "percent", "percentage"]),
    cost: firstString(record, ["cost", "estimated_cost"])
  };
}

function normalizeStatus(status: string | undefined): WebhookStatus {
  const value = status?.toLowerCase();
  if (!value) return "completed";
  if (["succeeded", "success", "completed", "complete", "done", "finished"].includes(value)) return "completed";
  if (["failed", "error", "cancelled", "canceled"].includes(value)) return "failed";
  if (["running", "processing", "queued", "pending"].includes(value)) return "processing";
  return "submitted";
}

function findWebhookTask(workspace: WorkspaceSnapshot, input: WebhookInput) {
  return workspace.tasks.find((task) => input.taskId && task.id === input.taskId)
    ?? workspace.tasks.find((task) => input.externalJobId && task.externalJobId === input.externalJobId);
}

function taskWithProviderUpdate(
  task: GenerationTask,
  input: WebhookInput,
  status: WebhookStatus,
  mediaStorage?: MediaResultStorage
): GenerationTask {
  return {
    ...task,
    providerId: input.providerId ?? task.providerId,
    providerLabel: input.providerLabel ?? task.providerLabel,
    providerStatus: status,
    externalJobId: input.externalJobId ?? task.externalJobId,
    providerResultUrl: input.resultUrl ?? task.providerResultUrl,
    resultAssetUrl: mediaStorage?.url ?? task.resultAssetUrl,
    providerWarning: input.error ?? input.warning ?? mediaStorage?.warning ?? task.providerWarning,
    cost: input.cost ?? task.cost,
    progress: status === "completed"
      ? 100
      : status === "failed"
        ? 0
        : Math.max(task.progress ?? 25, input.progress ?? (status === "processing" ? 70 : 35)),
    status: status === "failed" ? "失败" : "生成中",
    updatedAt: new Date().toISOString()
  };
}

function webhookMeta(
  status: WebhookStatus,
  signature: WebhookSignatureVerification,
  mediaStorage?: MediaResultStorage,
  input?: WebhookInput
) {
  const errorCategory = status === "failed"
    ? classifyProviderError(input?.error ?? input?.warning)
    : undefined;

  return {
    status,
    signature: signature.status,
    providerId: signature.providerId,
    checkedHeaders: signature.checkedHeaders,
    mediaStorage,
    errorCategory
  };
}

function parseRawJson(rawBody: string) {
  if (!rawBody.trim()) return undefined;
  return JSON.parse(rawBody);
}

async function completeWebhookTask(task: GenerationTask, input: WebhookInput) {
  const mediaStorage = await persistMediaResult(task.id, input.resultUrl);
  const preparedTask = taskWithProviderUpdate(task, input, "completed", mediaStorage);
  const preparedWorkspace = await upsertTask(preparedTask);
  const taskForArtifact = preparedWorkspace.tasks.find((item) => item.id === task.id) ?? preparedTask;
  const artifact = buildGenerationArtifact(taskForArtifact);
  const assistantMessage = buildGenerationAssistantMessage(taskForArtifact, artifact);
  const completedWorkspace = await completeGenerationJob(task.id, artifact, assistantMessage);

  return {
    task: completedWorkspace.tasks.find((item) => item.id === task.id) ?? taskForArtifact,
    artifact,
    assistantMessage,
    mediaStorage
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "");
  const body = await Promise.resolve().then(() => parseRawJson(rawBody)).catch(() => undefined);
  const parsed = webhookSchema.safeParse(normalizeWebhookPayload(body));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const signature = verifyWebhookSignature(request, rawBody, parsed.data.providerId);
  if (!signature.authorized) {
    return NextResponse.json({
      error: "Unauthorized webhook",
      signature: signature.status,
      message: signature.message,
      checkedHeaders: signature.checkedHeaders
    }, { status: 401 });
  }

  const workspace = await getWorkspaceForClient();
  const task = findWebhookTask(workspace, parsed.data);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const status = normalizeStatus(parsed.data.status);
  if (status === "completed") {
    const result = await completeWebhookTask(task, parsed.data);
    return NextResponse.json({
      task: result.task,
      artifact: result.artifact,
      assistantMessage: result.assistantMessage,
      webhook: webhookMeta(status, signature, result.mediaStorage, parsed.data)
    });
  }

  const updatedTask = taskWithProviderUpdate(task, parsed.data, status);
  const updatedWorkspace = await upsertTask(updatedTask);
  return NextResponse.json({
    task: updatedWorkspace.tasks.find((item) => item.id === task.id) ?? updatedTask,
    webhook: webhookMeta(status, signature, undefined, parsed.data)
  });
}
