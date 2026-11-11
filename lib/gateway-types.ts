import type { Artifact, GenerationTask, MaterialAsset, Message, ModelEngine, ProductProfile, RouteSkill, VisualGenerationSettings, WorkspaceMode } from "@/lib/workbench-data";

export type GatewayProviderId =
  | "demo"
  | "deepseek"
  | "qwen"
  | "zhipu"
  | "volcengine"
  | "openai"
  | "minimax"
  | "claude"
  | "gemini"
  | "jimeng"
  | "kling"
  | "midjourney"
  | "flux"
  | "gpt-image"
  | "stable-diffusion"
  | "custom";

export type GatewayProviderConfig = {
  id: GatewayProviderId | string;
  label: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  kind?: "chat" | "media";
  capabilities?: Array<"text" | "image" | "video" | "poster" | "deck">;
};

export type ProviderRoutingStrategy =
  | "balanced"
  | "domestic-first"
  | "international-first"
  | "lowest-cost"
  | "quality-first";

export type ProviderRoutingPolicy = {
  textStrategy: ProviderRoutingStrategy;
  updatedAt?: string;
};

export const defaultProviderRoutingPolicy: ProviderRoutingPolicy = {
  textStrategy: "balanced"
};

export const providerRoutingStrategyLabels: Record<ProviderRoutingStrategy, string> = {
  balanced: "均衡",
  "domestic-first": "国内优先",
  "international-first": "国际优先",
  "lowest-cost": "低成本优先",
  "quality-first": "质量优先"
};

const providerRoutingOrders: Record<ProviderRoutingStrategy, string[]> = {
  balanced: ["deepseek", "qwen", "minimax", "zhipu", "volcengine", "openai", "claude", "gemini", "custom"],
  "domestic-first": ["deepseek", "qwen", "minimax", "zhipu", "volcengine", "custom", "openai", "claude", "gemini"],
  "international-first": ["openai", "claude", "gemini", "minimax", "deepseek", "qwen", "zhipu", "volcengine", "custom"],
  "lowest-cost": ["deepseek", "qwen", "minimax", "gemini", "zhipu", "volcengine", "openai", "claude", "custom"],
  "quality-first": ["claude", "openai", "gemini", "qwen", "deepseek", "zhipu", "minimax", "volcengine", "custom"]
};

type ProviderSelectionOptions = {
  routingPolicy?: ProviderRoutingPolicy;
  hasCredential?: (config: GatewayProviderConfig) => boolean;
};

export type GenerateRequest = {
  prompt: string;
  mode: WorkspaceMode;
  product: ProductProfile;
  skill: RouteSkill;
  model: ModelEngine;
  provider: GatewayProviderConfig;
  history?: Message[];
  materials?: MaterialAsset[];
  visualSettings?: VisualGenerationSettings;
};

export type GenerateResponse = {
  artifact: Artifact;
  assistantMessage: Message;
  task: GenerationTask;
  providerUsed: string;
  fallback: boolean;
  warning?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type ProviderTestStatus =
  | "ok"
  | "demo"
  | "missing-key"
  | "missing-url"
  | "http-error"
  | "invalid-response"
  | "network-error"
  | "timeout";

export type ProviderTestResult = {
  ok: boolean;
  status: ProviderTestStatus;
  providerId: string;
  label: string;
  model: string;
  endpoint: string;
  message: string;
  suggestion?: string;
  statusCode?: number;
  latencyMs?: number;
  checkedAt: string;
};

export const gatewayProviderPresets: GatewayProviderConfig[] = [
  {
    id: "demo",
    label: "Demo 本地生成",
    baseUrl: "local://demo",
    model: "bmxian-demo",
    apiKey: "",
    enabled: true,
    kind: "chat",
    capabilities: ["text", "image", "video", "poster", "deck"]
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "qwen",
    label: "通义 / 阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4/",
    model: "glm-5.1",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text", "deck"]
  },
  {
    id: "volcengine",
    label: "火山方舟 / 豆包",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "ep-your-endpoint-id",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "openai",
    label: "ChatGPT / OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.5",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "minimax",
    label: "MiniMax",
    baseUrl: "https://api.minimax.io/v1",
    model: "MiniMax-M3",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "claude",
    label: "Claude",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-6",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "gemini",
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3.5-flash",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  },
  {
    id: "jimeng",
    label: "即梦视觉",
    baseUrl: "local://demo",
    model: "jimeng-image-video",
    apiKey: "",
    enabled: false,
    kind: "media",
    capabilities: ["image", "poster", "video"]
  },
  {
    id: "kling",
    label: "可灵视频",
    baseUrl: "local://demo",
    model: "kling-video",
    apiKey: "",
    enabled: false,
    kind: "media",
    capabilities: ["video"]
  },
  {
    id: "midjourney",
    label: "Midjourney 网关",
    baseUrl: "https://api.example.com/midjourney",
    model: "midjourney-v7",
    apiKey: "",
    enabled: false,
    kind: "media",
    capabilities: ["image", "poster"]
  },
  {
    id: "flux",
    label: "FLUX / Black Forest Labs",
    baseUrl: "https://api.bfl.ai/v1",
    model: "flux-pro-2",
    apiKey: "",
    enabled: false,
    kind: "media",
    capabilities: ["image", "poster"]
  },
  {
    id: "gpt-image",
    label: "GPT Image",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-image-1",
    apiKey: "",
    enabled: false,
    kind: "media",
    capabilities: ["image", "poster"]
  },
  {
    id: "stable-diffusion",
    label: "Stable Diffusion + LoRA",
    baseUrl: "https://api.stability.ai",
    model: "stable-image-ultra",
    apiKey: "",
    enabled: false,
    kind: "media",
    capabilities: ["image", "poster"]
  },
  {
    id: "custom",
    label: "自定义 OpenAI-compatible",
    baseUrl: "https://api.example.com/v1",
    model: "model-id",
    apiKey: "",
    enabled: false,
    kind: "chat",
    capabilities: ["text"]
  }
];

function isTextProvider(config: GatewayProviderConfig) {
  return config.id !== "demo" && config.kind !== "media";
}

function sortedTextProviders(candidates: GatewayProviderConfig[], strategy: ProviderRoutingStrategy) {
  const order = providerRoutingOrders[strategy] ?? providerRoutingOrders.balanced;
  const byId = new Map(candidates.map((config) => [config.id, config]));
  const sorted = order.flatMap((id) => byId.get(id) ? [byId.get(id) as GatewayProviderConfig] : []);
  const orderedIds = new Set(sorted.map((config) => config.id));
  return [
    ...sorted,
    ...candidates.filter((config) => !orderedIds.has(config.id))
  ];
}

function providerConfigForAuto(configs: GatewayProviderConfig[], options: ProviderSelectionOptions = {}) {
  const enabledTextProviders = configs.filter((config) => config.enabled && isTextProvider(config));
  const credentialedProviders = options.hasCredential
    ? enabledTextProviders.filter(options.hasCredential)
    : enabledTextProviders;
  const strategy = options.routingPolicy?.textStrategy ?? defaultProviderRoutingPolicy.textStrategy;
  const candidates = credentialedProviders.length ? credentialedProviders : enabledTextProviders;

  return sortedTextProviders(candidates, strategy)[0]
    ?? configs.find((config) => config.id === "demo")
    ?? configs[0];
}

export function providerConfigForModel(
  modelId: string,
  configs: GatewayProviderConfig[],
  options: ProviderSelectionOptions = {}
) {
  if (modelId === "deepseek") return configs.find((config) => config.id === "deepseek") ?? configs[0];
  if (modelId === "qwen") return configs.find((config) => config.id === "qwen") ?? configs[0];
  if (modelId === "doubao") return configs.find((config) => config.id === "volcengine") ?? configs[0];
  if (modelId === "openai") return configs.find((config) => config.id === "openai") ?? configs[0];
  if (modelId === "minimax") return configs.find((config) => config.id === "minimax") ?? configs[0];
  if (modelId === "claude") return configs.find((config) => config.id === "claude") ?? configs[0];
  if (modelId === "gemini") return configs.find((config) => config.id === "gemini") ?? configs[0];
  if (modelId === "jimeng") return configs.find((config) => config.id === "jimeng") ?? configs.find((config) => config.id === "demo") ?? configs[0];
  if (modelId === "kling") return configs.find((config) => config.id === "kling") ?? configs.find((config) => config.id === "demo") ?? configs[0];
  if (modelId === "midjourney") return configs.find((config) => config.id === "midjourney") ?? configs.find((config) => config.id === "demo") ?? configs[0];
  if (modelId === "flux") return configs.find((config) => config.id === "flux") ?? configs.find((config) => config.id === "demo") ?? configs[0];
  if (modelId === "gpt-image") return configs.find((config) => config.id === "gpt-image") ?? configs.find((config) => config.id === "demo") ?? configs[0];
  if (modelId === "stable-diffusion") return configs.find((config) => config.id === "stable-diffusion") ?? configs.find((config) => config.id === "demo") ?? configs[0];
  if (modelId === "auto") {
    return providerConfigForAuto(configs, options);
  }
  return configs.find((config) => config.id === modelId) ?? configs.find((config) => config.id === "demo") ?? configs[0];
}
