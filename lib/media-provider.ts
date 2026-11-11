import type { GatewayProviderConfig } from "@/lib/gateway-types";
import type { MaterialAsset, ModelEngine, ProductProfile, RouteSkill, VisualGenerationSettings, WorkspaceMode } from "@/lib/workbench-data";

export type MediaMode = Extract<WorkspaceMode, "图片" | "视频" | "海报" | "PPT">;

type MediaProviderStatus = "demo" | "submitted" | "processing" | "completed" | "failed" | "fallback";

export type MediaGenerationInput = {
  taskId: string;
  prompt: string;
  mode: MediaMode;
  product: ProductProfile;
  skill: RouteSkill;
  model: ModelEngine;
  visualSettings?: VisualGenerationSettings;
  materials?: MaterialAsset[];
};

export type MediaProviderUpdate = {
  providerId: string;
  providerLabel: string;
  providerStatus: MediaProviderStatus;
  externalJobId?: string;
  progress?: number;
  cost?: string;
  warning?: string;
  resultUrl?: string;
};

export type MediaProviderRequest = {
  adapter: "generic" | "jimeng" | "kling" | "midjourney" | "flux" | "gpt-image" | "stable-diffusion";
  endpoint: string;
  method: "POST";
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function mediaProviderJobsEndpoint(baseUrl: string) {
  const normalized = stripTrailingSlash(baseUrl.trim());
  if (normalized.endsWith("/jobs")) return normalized;
  if (normalized.endsWith("/generate")) return normalized;
  return `${normalized}/jobs`;
}

function mediaProviderKey(provider: GatewayProviderConfig) {
  if (provider.apiKey && !provider.apiKey.includes("••••")) return provider.apiKey;

  const envMap: Record<string, string | undefined> = {
    jimeng: process.env.JIMENG_API_KEY ?? process.env.VOLCENGINE_VISUAL_API_KEY,
    kling: process.env.KLING_API_KEY,
    midjourney: process.env.MIDJOURNEY_API_KEY,
    flux: process.env.BFL_API_KEY ?? process.env.FLUX_API_KEY,
    "gpt-image": process.env.OPENAI_API_KEY,
    "stable-diffusion": process.env.STABILITY_API_KEY ?? process.env.STABLE_DIFFUSION_API_KEY,
    custom: process.env.BMXIAN_CUSTOM_API_KEY
  };

  return envMap[provider.id];
}

function capabilityForMode(mode: MediaMode) {
  if (mode === "图片") return "image";
  if (mode === "海报") return "poster";
  if (mode === "视频") return "video";
  return "deck";
}

function hasCapability(provider: GatewayProviderConfig, mode: MediaMode) {
  return !provider.capabilities?.length || provider.capabilities.includes(capabilityForMode(mode));
}

function isLocalProvider(provider: GatewayProviderConfig) {
  return provider.id === "demo" || provider.baseUrl.startsWith("local://");
}

function remoteProviderBlocker(provider: GatewayProviderConfig, mode: MediaMode) {
  if (isLocalProvider(provider)) return "local-demo";
  if (provider.kind !== "media") return `${provider.label} 不是媒体 Provider。`;
  if (!provider.enabled) return `${provider.label} 未启用。`;
  if (!provider.baseUrl.trim()) return `${provider.label} 缺少 Base URL。`;
  if (!hasCapability(provider, mode)) return `${provider.label} 不支持${mode}任务。`;
  if (!mediaProviderKey(provider)) return `${provider.label} 缺少 API Key。`;
  return "";
}

function demoUpdate(taskId: string, provider: GatewayProviderConfig, mode: MediaMode, warning?: string): MediaProviderUpdate {
  return {
    providerId: provider.id,
    providerLabel: provider.label,
    providerStatus: warning ? "fallback" : "demo",
    externalJobId: `demo-${taskId}`,
    progress: 25,
    cost: warning ? "Demo fallback" : undefined,
    warning: warning ? `${warning} 已使用 Demo 本地生成，${mode}任务不会卡住。` : undefined
  };
}

function providerAdapter(provider: GatewayProviderConfig): MediaProviderRequest["adapter"] {
  if (provider.id === "jimeng") return "jimeng";
  if (provider.id === "kling") return "kling";
  if (provider.id === "midjourney") return "midjourney";
  if (provider.id === "flux") return "flux";
  if (provider.id === "gpt-image") return "gpt-image";
  if (provider.id === "stable-diffusion") return "stable-diffusion";
  return "generic";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

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

function firstArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return undefined;
}

function resultUrlFromPayload(record: Record<string, unknown>) {
  const direct = firstString(record, ["url", "result_url", "output_url", "asset_url", "download_url"]);
  if (direct) return direct;

  const output = asRecord(record.output) ?? asRecord(record.result) ?? asRecord(record.artifact);
  const nested = output ? firstString(output, ["url", "result_url", "output_url", "asset_url", "download_url"]) : undefined;
  if (nested) return nested;

  const data = firstArray(record, ["data", "items", "images", "videos"]);
  const firstItem = asRecord(data?.[0]);
  if (firstItem) {
    const itemUrl = firstString(firstItem, ["url", "result_url", "output_url", "asset_url", "download_url"]);
    if (itemUrl) return itemUrl;
  }

  const resultVideos = output ? firstArray(output, ["videos", "images", "items"]) : undefined;
  const firstResult = asRecord(resultVideos?.[0]);
  return firstResult ? firstString(firstResult, ["url", "result_url", "output_url", "asset_url", "download_url"]) : undefined;
}

function normalizedStatus(raw: string | undefined): MediaProviderStatus {
  const value = raw?.toLowerCase();
  if (!value) return "submitted";
  if (["succeeded", "success", "completed", "complete", "done", "finished"].includes(value)) return "completed";
  if (["failed", "error", "cancelled", "canceled"].includes(value)) return "failed";
  if (["running", "processing", "queued", "pending", "created"].includes(value)) return "processing";
  return "submitted";
}

function parseProviderPayload(
  provider: GatewayProviderConfig,
  taskId: string,
  payload: unknown
): MediaProviderUpdate {
  const record = asRecord(payload) ?? {};
  const data = asRecord(record.data) ?? asRecord(record.result) ?? asRecord(record.output);
  const status = normalizedStatus(
    firstString(record, ["status", "state", "job_status", "task_status"])
      ?? (data ? firstString(data, ["status", "state", "job_status", "task_status"]) : undefined)
  );
  const externalJobId = firstString(record, ["id", "job_id", "task_id", "request_id"])
    ?? (data ? firstString(data, ["id", "job_id", "task_id", "request_id"]) : undefined)
    ?? `remote-${taskId}`;
  const progress = firstNumber(record, ["progress", "percent", "percentage"])
    ?? (data ? firstNumber(data, ["progress", "percent", "percentage"]) : undefined);
  const resultUrl = resultUrlFromPayload(record);

  return {
    providerId: provider.id,
    providerLabel: provider.label,
    providerStatus: status,
    externalJobId,
    progress: status === "completed" ? 100 : progress,
    cost: firstString(record, ["cost", "estimated_cost"]),
    resultUrl
  };
}

function materialUrls(input: MediaGenerationInput) {
  return input.materials
    ?.filter((material) => material.url && ["图片", "视频", "文档", "其他"].includes(material.kind))
    .map((material) => material.url)
    .slice(0, 8) ?? [];
}

function characterReferences(input: MediaGenerationInput) {
  const visual = input.visualSettings;
  const references = materialUrls(input);
  return [
    visual?.characterReferenceUrl?.trim(),
    ...(visual?.referenceFaceUrls ?? []),
    ...references
  ].filter((url): url is string => Boolean(url)).slice(0, 8);
}

function ratioForVideo(input: MediaGenerationInput) {
  const ratio = input.visualSettings?.aspectRatio;
  return ratio && ["16:9", "9:16", "1:1"].includes(ratio) ? ratio : "16:9";
}

function sizeForImage(input: MediaGenerationInput) {
  const ratio = input.visualSettings?.aspectRatio;
  if (ratio === "16:9") return "1280x720";
  if (ratio === "9:16") return "720x1280";
  if (ratio === "1:1") return "1024x1024";
  if (ratio === "21:9") return "1536x640";
  return "960x1280";
}

function promptWithVisualLock(input: MediaGenerationInput) {
  const visual = input.visualSettings;
  if (!visual?.lockStyle) return input.prompt;

  return [
    input.prompt,
    `统一风格：${visual.styleName}`,
    visual.stylePrompt,
    visual.negativePrompt ? `反向提示词：${visual.negativePrompt}` : "",
    visual.characterLock ? `角色一致性：锁定同一角色${visual.characterName ? `「${visual.characterName}」` : ""}，脸型、发型、服装、比例和识别特征必须一致，不允许换人。` : "",
    visual.identityVectorId ? `Identity向量：${visual.identityVectorId} / ${visual.identityEncoder ?? "identity-encoder"} / 强度 ${visual.identityStrength ?? visual.characterStrength ?? 0.82}` : "",
    visual.triggerWords?.length ? `风格LoRA触发词：${visual.triggerWords.join(", ")}` : "",
    visual.characterLoraTriggerWords?.length ? `角色LoRA触发词：${visual.characterLoraTriggerWords.join(", ")}` : ""
  ].filter(Boolean).join("\n");
}

function visualConsistency(input: MediaGenerationInput) {
  const visual = input.visualSettings;
  if (!visual) return undefined;

  return {
    styleLocked: visual.lockStyle,
    styleName: visual.styleName,
    stylePrompt: visual.stylePrompt,
    aspectRatio: visual.aspectRatio,
    characterLocked: visual.characterLock,
    characterProfileId: visual.characterProfileId,
    characterVersion: visual.characterVersion,
    characterName: visual.characterName,
    characterReferenceUrl: visual.characterReferenceUrl,
    characterReferenceUrls: visual.referenceFaceUrls?.length ? visual.referenceFaceUrls : characterReferences(input),
    identity: {
      encoder: visual.identityEncoder,
      vectorId: visual.identityVectorId,
      dimensions: visual.identityDimensions,
      consistencyScore: visual.identityConsistencyScore,
      strength: visual.identityStrength ?? visual.characterStrength ?? 0.82
    },
    fusionWeights: {
      identity: visual.identityStrength ?? visual.characterStrength ?? 0.82,
      style: visual.styleStrength ?? visual.loraWeight ?? 0.68,
      prompt: visual.promptStrength ?? 1,
      state: visual.stateStrength ?? 0.4
    },
    statePreset: visual.statePreset,
    memorySceneIds: visual.memorySceneIds ?? [],
    negativePrompt: visual.negativePrompt,
    generationCount: visual.generationCount ?? 1,
    characterStrength: visual.characterStrength ?? visual.identityStrength ?? 0.82,
    seed: visual.seed || undefined,
    lora: [
      visual.styleLoraId
        ? {
            id: visual.styleLoraId,
            weight: visual.loraWeight ?? 0.68,
            type: "style",
            triggerWords: visual.triggerWords ?? []
          }
        : undefined,
      visual.characterLoraId
        ? {
            id: visual.characterLoraId,
            assetId: visual.characterLoraAssetId,
            name: visual.characterLoraName,
            url: visual.characterLoraUrl,
            baseModel: visual.characterLoraBaseModel,
            weight: visual.characterLoraWeight ?? 0.72,
            type: "character",
            triggerWords: visual.characterLoraTriggerWords ?? []
          }
        : undefined
    ].filter(Boolean),
    triggerWords: [
      ...(visual.triggerWords ?? []),
      ...(visual.characterLoraTriggerWords ?? [])
    ]
  };
}

function metadataFor(input: MediaGenerationInput) {
  return {
    app: "bmxian",
    taskId: input.taskId,
    mode: input.mode,
    productId: input.product.id,
    productName: input.product.name,
    skillId: input.skill.id,
    skillName: input.skill.name,
    createdAt: new Date().toISOString()
  };
}

function genericMediaProviderPayload(input: MediaGenerationInput) {
  return {
    id: input.taskId,
    mode: input.mode,
    model: input.model.id,
    modelName: input.model.name,
    prompt: promptWithVisualLock(input),
    product: {
      id: input.product.id,
      name: input.product.name,
      category: input.product.category,
      audience: input.product.audience,
      platform: input.product.platform,
      tone: input.product.tone,
      notes: input.product.notes
    },
    skill: {
      id: input.skill.id,
      name: input.skill.name,
      category: input.skill.category,
      fields: input.skill.fields
    },
    visualSettings: input.visualSettings,
    consistency: visualConsistency(input),
    materials: input.materials?.map((material) => ({
      id: material.id,
      name: material.name,
      kind: material.kind,
      mimeType: material.mimeType,
      url: material.url,
      tags: material.tags
    })) ?? [],
    metadata: metadataFor(input)
  };
}

function jimengEndpoint(baseUrl: string, mode: MediaMode) {
  const base = stripTrailingSlash(baseUrl.trim());
  if (base.endsWith("/images/generations") || base.endsWith("/videos/generations") || base.endsWith("/jobs")) {
    return base;
  }
  return mode === "视频" ? `${base}/videos/generations` : `${base}/images/generations`;
}

function klingEndpoint(baseUrl: string) {
  const base = stripTrailingSlash(baseUrl.trim());
  if (base.endsWith("/videos/generations") || base.endsWith("/jobs")) return base;
  if (base.endsWith("/v1")) return `${base}/videos/generations`;
  return `${base}/v1/videos/generations`;
}

function jimengPayload(provider: GatewayProviderConfig, input: MediaGenerationInput) {
  const references = characterReferences(input);
  const body: Record<string, unknown> = {
    model: provider.model || "doubao-seedream-4-0-250828",
    prompt: promptWithVisualLock(input),
    metadata: metadataFor(input)
  };

  if (input.mode === "视频") {
    return {
      ...body,
      aspect_ratio: ratioForVideo(input),
      duration: 5,
    reference_images: references
    };
  }

  return {
    ...body,
    size: sizeForImage(input),
    response_format: "url",
    n: 1,
    image: references
  };
}

function klingPayload(provider: GatewayProviderConfig, input: MediaGenerationInput) {
  const references = characterReferences(input);
  const prompt = promptWithVisualLock(input);
  return {
    model: provider.model || "kling-v3-text-to-video",
    prompt,
    aspect_ratio: ratioForVideo(input),
    duration: 5,
    quality: "720p",
    image_start: references[0],
    metadata: metadataFor(input)
  };
}

function midjourneyEndpoint(baseUrl: string) {
  const base = stripTrailingSlash(baseUrl.trim());
  if (base.endsWith("/imagine") || base.endsWith("/jobs")) return base;
  return `${base}/imagine`;
}

function fluxEndpoint(provider: GatewayProviderConfig) {
  const base = stripTrailingSlash(provider.baseUrl.trim());
  if (base.endsWith("/generate") || base.endsWith(provider.model)) return base;
  if (base.endsWith("/v1")) return `${base}/${provider.model || "flux-pro-2"}`;
  return `${base}/v1/${provider.model || "flux-pro-2"}`;
}

function gptImageEndpoint(baseUrl: string) {
  const base = stripTrailingSlash(baseUrl.trim());
  if (base.endsWith("/images/generations")) return base;
  if (base.endsWith("/v1")) return `${base}/images/generations`;
  return `${base}/v1/images/generations`;
}

function stableDiffusionEndpoint(baseUrl: string) {
  const base = stripTrailingSlash(baseUrl.trim());
  if (base.endsWith("/generate") || base.endsWith("/jobs")) return base;
  return `${base}/generate`;
}

function midjourneyPayload(provider: GatewayProviderConfig, input: MediaGenerationInput) {
  const consistency = visualConsistency(input);
  return {
    model: provider.model || "midjourney-v7",
    prompt: promptWithVisualLock(input),
    aspect_ratio: input.visualSettings?.aspectRatio ?? "3:4",
    seed: input.visualSettings?.seed || undefined,
    character_reference: input.visualSettings?.characterReferenceUrl || undefined,
    character_weight: input.visualSettings?.identityStrength ?? input.visualSettings?.characterStrength ?? 0.82,
    style_reference: input.visualSettings?.referenceImage || undefined,
    consistency,
    metadata: metadataFor(input)
  };
}

function fluxPayload(provider: GatewayProviderConfig, input: MediaGenerationInput) {
  const consistency = visualConsistency(input);
  return {
    model: provider.model || "flux-pro-2",
    prompt: promptWithVisualLock(input),
    aspect_ratio: input.visualSettings?.aspectRatio ?? "3:4",
    seed: input.visualSettings?.seed ? Number(input.visualSettings.seed) || input.visualSettings.seed : undefined,
    input_image_urls: characterReferences(input),
    guidance: input.visualSettings?.identityStrength ?? input.visualSettings?.characterStrength ?? 0.82,
    consistency,
    metadata: metadataFor(input)
  };
}

function gptImagePayload(provider: GatewayProviderConfig, input: MediaGenerationInput) {
  return {
    model: provider.model || "gpt-image-1",
    prompt: promptWithVisualLock(input),
    size: sizeForImage(input),
    n: 1,
    response_format: "url",
    reference_images: characterReferences(input),
    metadata: {
      ...metadataFor(input),
      consistency: visualConsistency(input)
    }
  };
}

function stableDiffusionPayload(provider: GatewayProviderConfig, input: MediaGenerationInput) {
  const visual = input.visualSettings;
  return {
    model: provider.model || "sdxl-lora-gateway",
    prompt: promptWithVisualLock(input),
    aspect_ratio: visual?.aspectRatio ?? "3:4",
    seed: visual?.seed || undefined,
    reference_images: characterReferences(input),
    loras: visualConsistency(input)?.lora ?? [],
    character_consistency: {
      enabled: visual?.characterLock ?? true,
      profileId: visual?.characterProfileId,
      identityVectorId: visual?.identityVectorId,
      identityEncoder: visual?.identityEncoder,
      name: visual?.characterName,
      referenceUrl: visual?.characterReferenceUrl,
      referenceUrls: visual?.referenceFaceUrls,
      strength: visual?.identityStrength ?? visual?.characterStrength ?? 0.82,
      fusionWeights: visualConsistency(input)?.fusionWeights,
      negativePrompt: visual?.negativePrompt
    },
    metadata: metadataFor(input)
  };
}

export function buildMediaProviderRequest(
  provider: GatewayProviderConfig,
  input: MediaGenerationInput
): MediaProviderRequest {
  const apiKey = mediaProviderKey(provider);
  const adapter = providerAdapter(provider);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };

  if (adapter === "jimeng") {
    return {
      adapter,
      endpoint: jimengEndpoint(provider.baseUrl, input.mode),
      method: "POST",
      headers,
      body: jimengPayload(provider, input)
    };
  }

  if (adapter === "kling") {
    return {
      adapter,
      endpoint: klingEndpoint(provider.baseUrl),
      method: "POST",
      headers,
      body: klingPayload(provider, input)
    };
  }

  if (adapter === "midjourney") {
    return {
      adapter,
      endpoint: midjourneyEndpoint(provider.baseUrl),
      method: "POST",
      headers,
      body: midjourneyPayload(provider, input)
    };
  }

  if (adapter === "flux") {
    return {
      adapter,
      endpoint: fluxEndpoint(provider),
      method: "POST",
      headers,
      body: fluxPayload(provider, input)
    };
  }

  if (adapter === "gpt-image") {
    return {
      adapter,
      endpoint: gptImageEndpoint(provider.baseUrl),
      method: "POST",
      headers,
      body: gptImagePayload(provider, input)
    };
  }

  if (adapter === "stable-diffusion") {
    return {
      adapter,
      endpoint: stableDiffusionEndpoint(provider.baseUrl),
      method: "POST",
      headers,
      body: stableDiffusionPayload(provider, input)
    };
  }

  return {
    adapter,
    endpoint: mediaProviderJobsEndpoint(provider.baseUrl),
    method: "POST",
    headers,
    body: genericMediaProviderPayload(input)
  };
}

export async function submitMediaGenerationJob(
  provider: GatewayProviderConfig,
  input: MediaGenerationInput
): Promise<MediaProviderUpdate> {
  const blocker = remoteProviderBlocker(provider, input.mode);
  if (blocker) {
    return demoUpdate(input.taskId, provider, input.mode, blocker === "local-demo" ? undefined : blocker);
  }

  try {
    const request = buildMediaProviderRequest(provider, input);
    const response = await fetch(request.endpoint, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(45_000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return demoUpdate(input.taskId, provider, input.mode, `${provider.label} 提交失败 ${response.status}: ${errorText.slice(0, 180)}`);
    }

    return parseProviderPayload(provider, input.taskId, await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    return demoUpdate(input.taskId, provider, input.mode, `${provider.label} 提交异常：${message}`);
  }
}

export async function pollMediaGenerationJob(
  provider: GatewayProviderConfig,
  mode: MediaMode,
  taskId: string,
  externalJobId: string
): Promise<MediaProviderUpdate> {
  const blocker = remoteProviderBlocker(provider, mode);
  if (blocker) {
    return demoUpdate(taskId, provider, mode, blocker === "local-demo" ? undefined : blocker);
  }

  try {
    const response = await fetch(`${mediaProviderJobsEndpoint(provider.baseUrl)}/${encodeURIComponent(externalJobId)}`, {
      headers: {
        Authorization: `Bearer ${mediaProviderKey(provider)}`
      },
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return demoUpdate(taskId, provider, mode, `${provider.label} 轮询失败 ${response.status}: ${errorText.slice(0, 180)}`);
    }

    return parseProviderPayload(provider, taskId, await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    return demoUpdate(taskId, provider, mode, `${provider.label} 轮询异常：${message}`);
  }
}
