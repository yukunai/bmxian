import type { Artifact, GenerationTask, Message, WorkspaceMode } from "@/lib/workbench-data";

function artifactBody(task: GenerationTask) {
  const product = task.productName ?? "当前商品";
  const prompt = task.prompt ?? task.title;
  const providerLines = [
    task.providerLabel ? `生成引擎：${task.providerLabel}` : "",
    task.externalJobId ? `外部任务：${task.externalJobId}` : "",
    task.providerResultUrl ? `结果链接：${task.providerResultUrl}` : "",
    task.providerWarning ? `Provider 提醒：${task.providerWarning}` : ""
  ].filter(Boolean);
  const visualLines = task.visualSettings
    ? [
        `尺寸比例：${task.visualSettings.aspectRatio}`,
        `锁定风格：${task.visualSettings.styleName}`,
        `风格约束：${task.visualSettings.stylePrompt}`,
        task.visualSettings.characterProfileId ? `角色资产：${task.visualSettings.characterName || task.visualSettings.characterProfileId} / ${task.visualSettings.characterVersion || "v1"}` : "",
        task.visualSettings.identityVectorId ? `Identity：${task.visualSettings.identityEncoder || "encoder"} / ${task.visualSettings.identityVectorId} / 一致性 ${task.visualSettings.identityConsistencyScore ?? 0}` : "",
        task.visualSettings.characterLock ? `角色锁定：${task.visualSettings.characterName || "固定角色"} / 强度 ${task.visualSettings.characterStrength ?? 0.82}` : "",
        task.visualSettings.characterReferenceUrl ? `角色参考图：${task.visualSettings.characterReferenceUrl}` : "",
        task.visualSettings.referenceFaceUrls?.length ? `参考脸组：${task.visualSettings.referenceFaceUrls.join(", ")}` : "",
        task.visualSettings.characterLoraId ? `角色 LoRA：${task.visualSettings.characterLoraName || task.visualSettings.characterLoraId} / ${task.visualSettings.characterLoraId} / 权重 ${task.visualSettings.characterLoraWeight ?? 0.72}` : "",
        task.visualSettings.characterLoraUrl ? `LoRA 文件：${task.visualSettings.characterLoraUrl}` : "",
        task.visualSettings.characterLoraTriggerWords?.length ? `LoRA 触发词：${task.visualSettings.characterLoraTriggerWords.join(", ")}` : "",
        `Fusion：Identity ${task.visualSettings.identityStrength ?? task.visualSettings.characterStrength ?? 0.82} / Style ${task.visualSettings.styleStrength ?? task.visualSettings.loraWeight ?? 0.68} / Prompt ${task.visualSettings.promptStrength ?? 1} / State ${task.visualSettings.stateStrength ?? 0.4}`,
        task.visualSettings.negativePrompt ? `反向提示词：${task.visualSettings.negativePrompt}` : "",
        task.visualSettings.seed ? `固定 Seed：${task.visualSettings.seed}` : "",
        task.visualSettings.lockStyle ? "一致性要求：后续同组图片必须沿用同一构图语言、光线、色彩和质感，不允许跳脱。" : ""
      ].filter(Boolean)
    : [];

  if (task.type === "视频") {
    return [
      `视频生成任务包：${prompt}`,
      `商品：${product}`,
      ...providerLines,
      ...visualLines,
      "成片：生成 15 秒、30 秒和 60 秒三档视频方向。",
      "镜头 1：3 秒痛点开场，直接展示用户遇到的问题。",
      "镜头 2：8 秒商品细节和核心卖点，保留字幕安全区。",
      "镜头 3：10 秒使用场景切换，覆盖通勤、开箱、转化动作。",
      "镜头 4：5 秒 CTA，输出适合抖音/小红书的标题和封面方向。"
    ].join("\n");
  }

  if (task.type === "图片") {
    return [
      `图片生成任务包：${prompt}`,
      `商品：${product}`,
      ...providerLines,
      ...visualLines,
      "出图：生成主图、细节图和场景图三类候选方向。",
      "画面：干净自然光，主体占画面 60%，背景保留电商平台裁切安全区。",
      "生成指令：真实商品摄影、清晰材质、少量文字标签、避免夸张滤镜。"
    ].join("\n");
  }

  if (task.type === "海报") {
    return [
      `海报生成任务包：${prompt}`,
      `商品：${product}`,
      ...providerLines,
      ...visualLines,
      "出图：生成活动海报、详情页首屏和平台封面三类候选方向。",
      "画面：上方短标题，中间商品主体，下方三枚卖点标签。",
      "主标题：把用户利益写成 10 字以内，不用绝对化承诺。",
      "生成指令：竖版 3:4、方版 1:1、详情页首屏裁切建议。"
    ].join("\n");
  }

  return [
    `PPT生成任务包：${prompt}`,
    `商品：${product}`,
    ...providerLines,
    ...visualLines,
    "第 1 页：目标和背景。",
    "第 2 页：用户痛点和平台机会。",
    "第 3 页：商品卖点与证据。",
    "第 4 页：内容矩阵和投放节奏。",
    "第 5 页：预算、模型成本和上线排期。"
  ].join("\n");
}

export function buildGenerationArtifact(task: GenerationTask): Artifact {
  return {
    id: task.artifactId ?? `artifact-${task.id}`,
    type: task.type as WorkspaceMode,
    title: `${task.type}产物：${(task.prompt ?? task.title).slice(0, 18)}`,
    source: `${task.productName ?? "商品"} / ${task.skillName ?? "路线"} / ${task.model}${task.providerLabel ? ` / ${task.providerLabel}` : ""}${task.visualSettings ? ` / ${task.visualSettings.styleName} ${task.visualSettings.aspectRatio}` : ""}`,
    body: artifactBody(task),
    status: "待复核",
    mediaUrl: task.resultAssetUrl ?? task.providerResultUrl
  };
}

export function buildGenerationAssistantMessage(task: GenerationTask, artifact: Artifact): Message {
  const packageNameByType: Partial<Record<WorkspaceMode, string>> = {
    图片: "图片生成任务包",
    视频: "视频生成任务包",
    海报: "海报生成任务包",
    PPT: "PPT生成任务包"
  };
  const packageName = packageNameByType[artifact.type as WorkspaceMode] ?? `${artifact.type}任务包`;
  return {
    id: `msg-${task.id}`,
    role: "assistant",
    text: `「${task.title}」已完成，生成了 ${packageName}，并保存到作品集待复核。`,
    meta: "斑马线异步任务"
  };
}
