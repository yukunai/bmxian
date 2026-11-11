import type { Artifact, GenerationTask, Message } from "@/lib/workbench-data";
import type { GenerateRequest, GenerateResponse, GatewayProviderConfig, ProviderTestResult } from "@/lib/gateway-types";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type OpenAIResponsesResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

type ClaudeMessagesResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

type TextGenerationResult = {
  content: string;
  usage?: GenerateResponse["usage"];
};

type TextProviderProtocol = "openai-responses" | "openai-compatible" | "anthropic-messages" | "gemini-generate-content";

type ProviderTestFailureStatus = Exclude<ProviderTestResult["status"], "ok" | "demo">;

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function chatCompletionsEndpoint(baseUrl: string) {
  const normalized = stripTrailingSlash(baseUrl.trim());
  if (normalized.endsWith("/chat/completions")) return normalized;
  return `${normalized}/chat/completions`;
}

function openAIResponsesEndpoint(baseUrl: string) {
  const normalized = stripTrailingSlash(baseUrl.trim());
  if (normalized.endsWith("/responses")) return normalized;
  return `${normalized}/responses`;
}

function claudeMessagesEndpoint(baseUrl: string) {
  const normalized = stripTrailingSlash(baseUrl.trim());
  if (normalized.endsWith("/messages")) return normalized;
  return `${normalized}/messages`;
}

function geminiGenerateContentEndpoint(baseUrl: string, model: string) {
  const normalized = stripTrailingSlash(baseUrl.trim());
  if (normalized.includes(":generateContent")) return normalized;
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  return `${normalized}/${modelPath}:generateContent`;
}

function geminiFetchEndpoint(baseUrl: string, model: string, apiKey: string) {
  const endpoint = geminiGenerateContentEndpoint(baseUrl, model);
  if (endpoint.includes("key=")) return endpoint;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
}

function mediaJobsEndpoint(baseUrl: string) {
  const normalized = stripTrailingSlash(baseUrl.trim());
  if (normalized.endsWith("/jobs")) return normalized;
  if (normalized.endsWith("/generate")) return normalized;
  return `${normalized}/jobs`;
}

function textProviderProtocol(provider: GatewayProviderConfig): TextProviderProtocol {
  const providerId = provider.id.toLowerCase();
  if (providerId === "openai" || providerId.startsWith("openai-")) return "openai-responses";
  if (providerId === "claude" || providerId.startsWith("claude-")) return "anthropic-messages";
  if (providerId === "gemini" || providerId.startsWith("gemini-")) return "gemini-generate-content";
  return "openai-compatible";
}

function textProviderEndpoint(provider: GatewayProviderConfig) {
  const protocol = textProviderProtocol(provider);
  if (protocol === "openai-responses") return openAIResponsesEndpoint(provider.baseUrl);
  if (protocol === "anthropic-messages") return claudeMessagesEndpoint(provider.baseUrl);
  if (protocol === "gemini-generate-content") return geminiGenerateContentEndpoint(provider.baseUrl, provider.model);
  return chatCompletionsEndpoint(provider.baseUrl);
}

function textProviderFetchEndpoint(provider: GatewayProviderConfig, apiKey: string) {
  if (textProviderProtocol(provider) === "gemini-generate-content") {
    return geminiFetchEndpoint(provider.baseUrl, provider.model, apiKey);
  }

  return textProviderEndpoint(provider);
}

function textProviderHeaders(provider: GatewayProviderConfig, apiKey: string): Record<string, string> {
  if (textProviderProtocol(provider) === "anthropic-messages") {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    };
  }

  if (textProviderProtocol(provider) === "gemini-generate-content") {
    return {
      "Content-Type": "application/json"
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}

function envKeyForProvider(providerId: string) {
  const envMap: Record<string, string | undefined> = {
    deepseek: process.env.DEEPSEEK_API_KEY,
    qwen: process.env.DASHSCOPE_API_KEY,
    zhipu: process.env.ZHIPU_API_KEY ?? process.env.ZAI_API_KEY,
    volcengine: process.env.ARK_API_KEY ?? process.env.VOLCENGINE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    minimax: process.env.MINIMAX_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY,
    gemini: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
    jimeng: process.env.JIMENG_API_KEY ?? process.env.VOLCENGINE_VISUAL_API_KEY,
    kling: process.env.KLING_API_KEY,
    midjourney: process.env.MIDJOURNEY_API_KEY,
    flux: process.env.BFL_API_KEY ?? process.env.FLUX_API_KEY,
    "gpt-image": process.env.OPENAI_API_KEY,
    "stable-diffusion": process.env.STABILITY_API_KEY ?? process.env.STABLE_DIFFUSION_API_KEY,
    custom: process.env.BMXIAN_CUSTOM_API_KEY
  };

  return envMap[providerId];
}

function providerKey(provider: GatewayProviderConfig) {
  const explicitKey = provider.apiKey.trim();
  if (explicitKey && !explicitKey.includes("••••")) return explicitKey;
  return envKeyForProvider(provider.id)?.trim();
}

export function providerHasRuntimeKey(provider: GatewayProviderConfig) {
  return Boolean(providerKey(provider));
}

function providerTestResult(
  provider: GatewayProviderConfig,
  ok: boolean,
  status: ProviderTestResult["status"],
  message: string,
  options: Partial<Pick<ProviderTestResult, "suggestion" | "statusCode" | "latencyMs">> = {}
): ProviderTestResult {
  return {
    ok,
    status,
    providerId: provider.id,
    label: provider.label,
    model: provider.model,
    endpoint: provider.baseUrl.startsWith("local://")
      ? provider.baseUrl
      : provider.kind === "media"
        ? mediaJobsEndpoint(provider.baseUrl)
        : textProviderEndpoint(provider),
    message,
    checkedAt: new Date().toISOString(),
    ...options
  };
}

function providerErrorHint(statusCode: number) {
  if (statusCode === 401 || statusCode === 403) {
    return "检查 API Key 是否正确、是否属于当前区域或套餐，以及账号是否有该模型权限。";
  }

  if (statusCode === 404) {
    return "通常是 Base URL、chat/completions 路径或 Model ID 不匹配；火山方舟尤其要填 endpoint id。";
  }

  if (statusCode === 429) {
    return "请求已触发限流或额度不足，稍后重试，或在供应商控制台检查余额和并发限制。";
  }

  if (statusCode >= 500) {
    return "供应商侧暂时不可用或模型端点异常，稍后重试并检查供应商状态页。";
  }

  return "查看供应商返回内容，优先核对 Base URL、Model ID、区域和账号权限。";
}

function visualInstruction(request: GenerateRequest) {
  if (!request.visualSettings) return "视觉控制：未设置。";

  return [
    `视觉比例：${request.visualSettings.aspectRatio}`,
    `锁定风格：${request.visualSettings.styleName}`,
    `风格细则：${request.visualSettings.stylePrompt}`,
    request.visualSettings.lockStyle
      ? "强制一致性：后续同组图片、海报和详情页视觉必须沿用该风格，不允许改变主色、光线、构图语言、质感和排版气质。"
      : "强制一致性：未启用。"
  ].join("\n");
}

function systemPrompt(request: GenerateRequest) {
  return [
    "你是斑马线 Bmxian 的创作引擎。",
    "目标用户是国内电商商家、自媒体创作者和运营团队。",
    "输出要具体、可执行、中文优先，避免空泛营销话术。",
    `当前模式：${request.mode}`,
    `当前商品：${request.product.name}`,
    `商品卖点：${request.product.notes.join("、")}`,
    `目标人群：${request.product.audience}`,
    `平台：${request.product.platform}`,
    `使用路线：${request.skill.name} - ${request.skill.description}`,
    visualInstruction(request),
    request.materials?.length
      ? `可用素材：${request.materials.slice(0, 6).map((material) => `${material.name}(${material.kind})`).join("、")}`
      : "可用素材：暂无上传素材",
    "请输出一段适合保存为作品草稿的内容，不要解释你使用了什么模型。"
  ].join("\n");
}

function historyForTextProvider(request: GenerateRequest) {
  return (request.history ?? []).slice(-4).map((message) => ({
    role: message.role,
    content: message.text
  }));
}

function openAIResponseContent(payload: OpenAIResponsesResponse) {
  if (payload.output_text?.trim()) return payload.output_text.trim();

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function openAICompatibleContent(payload: ChatCompletionResponse) {
  return payload.choices?.[0]?.message?.content?.trim();
}

function claudeContent(payload: ClaudeMessagesResponse) {
  return payload.content
    ?.filter((block) => block.type === "text" || block.text)
    .map((block) => block.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function geminiContent(payload: GeminiGenerateContentResponse) {
  return payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseProviderPayload(provider: GatewayProviderConfig, payload: unknown): TextGenerationResult {
  const protocol = textProviderProtocol(provider);

  if (protocol === "openai-responses") {
    const typed = payload as OpenAIResponsesResponse;
    const content = openAIResponseContent(typed);
    if (!content) throw new Error(`${provider.label} 没有返回可用 output_text。`);
    return {
      content,
      usage: {
        promptTokens: typed.usage?.input_tokens,
        completionTokens: typed.usage?.output_tokens,
        totalTokens: typed.usage?.total_tokens
      }
    };
  }

  if (protocol === "anthropic-messages") {
    const typed = payload as ClaudeMessagesResponse;
    const content = claudeContent(typed);
    if (!content) throw new Error(`${provider.label} 没有返回可用 content text。`);
    const totalTokens = typed.usage?.input_tokens !== undefined || typed.usage?.output_tokens !== undefined
      ? (typed.usage?.input_tokens ?? 0) + (typed.usage?.output_tokens ?? 0)
      : undefined;
    return {
      content,
      usage: {
        promptTokens: typed.usage?.input_tokens,
        completionTokens: typed.usage?.output_tokens,
        totalTokens
      }
    };
  }

  if (protocol === "gemini-generate-content") {
    const typed = payload as GeminiGenerateContentResponse;
    const content = geminiContent(typed);
    if (!content) throw new Error(`${provider.label} 没有返回可用 candidates[0].content.parts 文本。`);
    return {
      content,
      usage: {
        promptTokens: typed.usageMetadata?.promptTokenCount,
        completionTokens: typed.usageMetadata?.candidatesTokenCount,
        totalTokens: typed.usageMetadata?.totalTokenCount
      }
    };
  }

  const typed = payload as ChatCompletionResponse;
  const content = openAICompatibleContent(typed);
  if (!content) throw new Error(`${provider.label} 没有返回可用 choices[0].message.content。`);
  return {
    content,
    usage: {
      promptTokens: typed.usage?.prompt_tokens,
      completionTokens: typed.usage?.completion_tokens,
      totalTokens: typed.usage?.total_tokens
    }
  };
}

function textProviderTestBody(provider: GatewayProviderConfig) {
  const protocol = textProviderProtocol(provider);

  if (protocol === "openai-responses") {
    return {
      model: provider.model,
      instructions: "你是斑马线的模型连通性检测器。",
      input: "只回复 OK",
      max_output_tokens: 8
    };
  }

  if (protocol === "anthropic-messages") {
    return {
      model: provider.model,
      max_tokens: 8,
      system: "你是斑马线的模型连通性检测器。",
      messages: [{ role: "user", content: "只回复 OK" }],
      temperature: 0
    };
  }

  if (protocol === "gemini-generate-content") {
    return {
      systemInstruction: {
        parts: [{ text: "你是斑马线的模型连通性检测器。" }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: "只回复 OK" }]
        }
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8
      }
    };
  }

  return {
    model: provider.model,
    messages: [
      { role: "system", content: "你是斑马线的模型连通性检测器。" },
      { role: "user", content: "只回复 OK" }
    ],
    temperature: 0,
    max_tokens: 8,
    stream: false
  };
}

function demoContent(request: GenerateRequest) {
  const noteLine = request.product.notes.slice(0, 3).join("、");
  const base = `围绕「${request.product.name}」和「${request.skill.name}」，建议先抓住 ${request.product.audience} 的真实使用场景，再把 ${noteLine} 转成可感知的利益点。`;
  const visualLine = request.visualSettings
    ? `\n\n视觉锁定：比例 ${request.visualSettings.aspectRatio}，统一采用「${request.visualSettings.styleName}」。${request.visualSettings.stylePrompt} 后续同组图片必须保持同一光线、色彩、构图和质感。`
    : "";

  if (request.mode === "电商") {
    return `${base}${visualLine}\n\n首屏文案：夏天出门不想闷、不想晒，也不想多带一件累赘外套。这件防晒衣主打轻薄、冰感和可收纳帽檐，适合通勤、旅行和午间外出。详情页建议分成“防晒力”“体感”“收纳”“场景”四段，避免使用绝对化承诺。`;
  }

  if (request.mode === "文章") {
    return `${base}${visualLine}\n\n文章结构：开头用一个具体场景切入，中段讲为什么普通防晒外套容易闷热，再展开这款产品如何解决体感、收纳和搭配问题，结尾给出适合人群和购买建议。`;
  }

  if (request.mode === "图片") {
    return `${base}${visualLine}\n\n图片生成：浅色通勤场景，人物半身或商品细节为主，主体清晰，右侧保留标题区。画面可使用“夏天通勤，防晒也要轻一点”的短标签，卖点控制在 3 个以内。`;
  }

  if (request.mode === "视频") {
    return `${base}${visualLine}\n\n视频生成：0-3 秒提出暴晒和闷热痛点；3-12 秒展示面料和帽檐；12-22 秒切换通勤、旅行、午休外出；22-30 秒总结适合人群并引导收藏/进店。`;
  }

  if (request.mode === "海报") {
    return `${base}${visualLine}\n\n海报生成：左侧大标题“夏天通勤，防晒轻一点”，右侧放商品穿搭或细节图，下方用 3 个短标签承接卖点：冰感、不闷、可收纳。画面要留出电商平台主图裁切安全区。`;
  }

  if (request.mode === "PPT") {
    return `${base}${visualLine}\n\nPPT生成：1. 用户痛点；2. 商品卖点；3. 平台内容策略；4. 小红书/淘宝/抖音素材样例；5. 模型生成成本；6. 上线排期。`;
  }

  return `${base}${visualLine}\n\n下一步可以继续生成小红书笔记、详情页文案、图片/海报方案或短视频脚本。`;
}

function ensureRemoteProvider(provider: GatewayProviderConfig) {
  const apiKey = providerKey(provider);

  if (!apiKey) {
    throw new Error(`Provider ${provider.label} 缺少 API Key`);
  }

  if (!provider.baseUrl || provider.baseUrl.startsWith("local://")) {
    throw new Error(`Provider ${provider.label} 缺少有效 BASE_URL`);
  }

  return apiKey;
}

async function callOpenAIResponsesProvider(request: GenerateRequest, provider: GatewayProviderConfig): Promise<TextGenerationResult> {
  const apiKey = ensureRemoteProvider(provider);
  const input = [
    ...historyForTextProvider(request).map((message) => ({
      role: message.role,
      content: message.content
    })),
    { role: "user", content: request.prompt }
  ];

  const response = await fetch(textProviderFetchEndpoint(provider, apiKey), {
    method: "POST",
    headers: textProviderHeaders(provider, apiKey),
    body: JSON.stringify({
      model: provider.model,
      instructions: systemPrompt(request),
      input,
      temperature: 0.72,
      max_output_tokens: 4096
    }),
    signal: AbortSignal.timeout(45_000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.label} 返回 ${response.status}: ${errorText.slice(0, 240)}`);
  }

  return parseProviderPayload(provider, await response.json());
}

async function callClaudeProvider(request: GenerateRequest, provider: GatewayProviderConfig): Promise<TextGenerationResult> {
  const apiKey = ensureRemoteProvider(provider);
  const messages = [
    ...historyForTextProvider(request).map((message) => ({
      role: message.role,
      content: message.content
    })),
    { role: "user", content: request.prompt }
  ];

  const response = await fetch(textProviderFetchEndpoint(provider, apiKey), {
    method: "POST",
    headers: textProviderHeaders(provider, apiKey),
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 4096,
      system: systemPrompt(request),
      messages,
      temperature: 0.72
    }),
    signal: AbortSignal.timeout(45_000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.label} 返回 ${response.status}: ${errorText.slice(0, 240)}`);
  }

  return parseProviderPayload(provider, await response.json());
}

async function callGeminiProvider(request: GenerateRequest, provider: GatewayProviderConfig): Promise<TextGenerationResult> {
  const apiKey = ensureRemoteProvider(provider);
  const contents = [
    ...historyForTextProvider(request).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    })),
    { role: "user", parts: [{ text: request.prompt }] }
  ];

  const response = await fetch(textProviderFetchEndpoint(provider, apiKey), {
    method: "POST",
    headers: textProviderHeaders(provider, apiKey),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt(request) }]
      },
      contents,
      generationConfig: {
        temperature: 0.72,
        maxOutputTokens: 4096
      }
    }),
    signal: AbortSignal.timeout(45_000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.label} 返回 ${response.status}: ${errorText.slice(0, 240)}`);
  }

  return parseProviderPayload(provider, await response.json());
}

async function callOpenAICompatibleProvider(request: GenerateRequest, provider: GatewayProviderConfig): Promise<TextGenerationResult> {
  const apiKey = ensureRemoteProvider(provider);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(request) },
    ...historyForTextProvider(request).map((message): ChatMessage => ({
      role: message.role,
      content: message.content
    })),
    { role: "user", content: request.prompt }
  ];

  const response = await fetch(textProviderFetchEndpoint(provider, apiKey), {
    method: "POST",
    headers: textProviderHeaders(provider, apiKey),
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.72,
      stream: false
    }),
    signal: AbortSignal.timeout(45_000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.label} 返回 ${response.status}: ${errorText.slice(0, 240)}`);
  }

  return parseProviderPayload(provider, await response.json());
}

async function callTextProvider(request: GenerateRequest, provider: GatewayProviderConfig) {
  const protocol = textProviderProtocol(provider);
  if (protocol === "openai-responses") return callOpenAIResponsesProvider(request, provider);
  if (protocol === "anthropic-messages") return callClaudeProvider(request, provider);
  if (protocol === "gemini-generate-content") return callGeminiProvider(request, provider);
  return callOpenAICompatibleProvider(request, provider);
}

export async function testGatewayProvider(provider: GatewayProviderConfig): Promise<ProviderTestResult> {
  const startedAt = Date.now();

  if (provider.id === "demo" || provider.baseUrl.startsWith("local://")) {
    return providerTestResult(provider, true, "demo", "Demo 本地生成可用，不需要外部 API Key。", {
      latencyMs: Date.now() - startedAt
    });
  }

  if (provider.kind === "media") {
    if (!provider.baseUrl.trim()) {
      return providerTestResult(provider, false, "missing-url", `${provider.label} 缺少 Base URL。`, {
        suggestion: "媒体 Provider 需要填写可提交异步任务的接口地址，通常是供应商网关或自建适配器地址。"
      });
    }

    const apiKey = providerKey(provider);
    if (!apiKey) {
      return providerTestResult(provider, false, "missing-key", `${provider.label} 缺少 API Key。`, {
        suggestion: "填写供应商 Key，或先保持 local://demo 让任务流继续走 Demo fallback。"
      });
    }

    return providerTestResult(
      provider,
      true,
      "ok",
      `${provider.label} 媒体 Provider 配置完整。真实提交会在图片、视频、海报或 PPT 异步任务中执行；若端点不兼容，任务会记录原因并回退 Demo。`,
      {
        latencyMs: Date.now() - startedAt,
        suggestion: "建议生产环境通过自建适配器统一供应商差异、回调验签、文件存储和计费。"
      }
    );
  }

  if (!provider.baseUrl.trim()) {
    return providerTestResult(provider, false, "missing-url", `${provider.label} 缺少 Base URL。`, {
      suggestion: "填写供应商的 OpenAI-compatible Base URL，例如 https://api.deepseek.com。"
    });
  }

  const apiKey = providerKey(provider);
  if (!apiKey) {
    return providerTestResult(provider, false, "missing-key", `${provider.label} 缺少 API Key。`, {
      suggestion: "可以在引擎中心输入 API Key，或在 .env.local 配置对应环境变量后重启 dev server。"
    });
  }

  try {
    const response = await fetch(textProviderFetchEndpoint(provider, apiKey), {
      method: "POST",
      headers: textProviderHeaders(provider, apiKey),
      body: JSON.stringify(textProviderTestBody(provider)),
      signal: AbortSignal.timeout(20_000)
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorText = await response.text();
      return providerTestResult(
        provider,
        false,
        "http-error",
        `${provider.label} 返回 ${response.status}: ${errorText.slice(0, 180) || response.statusText}`,
        {
          statusCode: response.status,
          latencyMs,
          suggestion: providerErrorHint(response.status)
        }
      );
    }

    try {
      parseProviderPayload(provider, await response.json());
    } catch (error) {
      return providerTestResult(provider, false, "invalid-response", error instanceof Error ? error.message : `${provider.label} 返回成功，但没有可用文本。`, {
        latencyMs,
        suggestion: "该端点可能与当前 Provider 协议不匹配，优先核对 Base URL、Model ID 和供应商 API 格式。"
      });
    }

    return providerTestResult(provider, true, "ok", `${provider.label} 已连通，模型 ${provider.model} 返回了有效内容。`, {
      latencyMs,
      statusCode: response.status
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    const status: ProviderTestFailureStatus = isTimeout ? "timeout" : "network-error";
    const message = error instanceof Error ? error.message : "网络请求失败";

    return providerTestResult(provider, false, status, `${provider.label} 连接失败：${message}`, {
      latencyMs: Date.now() - startedAt,
      suggestion: isTimeout
        ? "请求超过 20 秒未返回，检查网络、代理、供应商区域或模型端点状态。"
        : "检查 Base URL 是否可访问，必要时确认本机网络或代理能访问该供应商。"
    });
  }
}

function buildResponse(request: GenerateRequest, content: string, providerUsed: string, fallback: boolean, warning?: string, usage?: GenerateResponse["usage"]): GenerateResponse {
  const titleSeed = request.prompt.trim() || `${request.product.name} ${request.mode}`;
  const artifact: Artifact = {
    id: createId("artifact"),
    type: request.mode,
    title: `${request.mode}生成：${titleSeed.slice(0, 18)}${titleSeed.length > 18 ? "..." : ""}`,
    source: `${request.product.name} / ${request.skill.name} / ${providerUsed}${request.visualSettings ? ` / ${request.visualSettings.styleName} ${request.visualSettings.aspectRatio}` : ""}`,
    status: fallback ? "草稿" : "待复核",
    body: content
  };

  const assistantMessage: Message = {
    id: createId("msg"),
    role: "assistant",
    text: fallback
      ? `已使用 Demo fallback 生成一份「${artifact.title}」。${warning ?? ""}`
      : `已通过「${providerUsed}」生成一份「${artifact.title}」，并保存到作品集草稿。`,
    meta: fallback ? "斑马线 Demo fallback" : "斑马线模型网关"
  };

  const task: GenerationTask = {
    id: createId("task"),
    title: `${request.mode}任务：${titleSeed.slice(0, 16)}${titleSeed.length > 16 ? "..." : ""}`,
    type: request.mode,
    model: providerUsed,
    cost: usage?.totalTokens ? `${usage.totalTokens} tokens` : "Demo",
    status: "已完成",
    visualSettings: request.visualSettings
  };

  return {
    artifact,
    assistantMessage,
    task,
    providerUsed,
    fallback,
    warning,
    usage
  };
}

export async function generateWithGateway(request: GenerateRequest): Promise<GenerateResponse> {
  const provider = request.provider;

  if (provider.id === "demo" || provider.baseUrl.startsWith("local://")) {
    return buildResponse(request, demoContent(request), provider.label, true);
  }

  try {
    const result = await callTextProvider(request, provider);
    return buildResponse(request, result.content, provider.label, false, undefined, result.usage);
  } catch (error) {
    const warning = error instanceof Error ? error.message : "模型调用失败";
    return buildResponse(request, demoContent(request), "Demo 本地生成", true, warning);
  }
}
