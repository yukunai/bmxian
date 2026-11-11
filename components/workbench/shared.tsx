import { FileStack } from "lucide-react";
import type { GatewayProviderConfig, ProviderRoutingPolicy } from "@/lib/gateway-types";
import { initialCharacterProfiles, initialLoraAssets, modelEngines, visualStylePresets } from "@/lib/workbench-data";
import type {
  Artifact,
  GenerationTask,
  KeyVaultSecret,
  CharacterProfile,
  LoraAsset,
  MaterialAsset,
  Message,
  NavKey,
  PaymentSession,
  ProductProfile,
  PublishPlanItem,
  RouteSkill,
  TeamMember,
  TeamMemberRole,
  VisualAspectRatio,
  VisualGenerationSettings,
  WorkspaceMode
} from "@/lib/workbench-data";

const defaultPrompt = "先聊聊我的想法，帮我把它整理成清楚的下一步。";
const appStorageKey = "bmxian:workspace:v1";
const asyncModes = new Set<WorkspaceMode>(["图片", "视频", "海报", "PPT"]);
const visualControlModes = new Set<WorkspaceMode>(["图片", "海报"]);
const modeDefaultModelIds: Record<WorkspaceMode, string> = {
  聊天: "auto",
  文章: "qwen",
  电商: "deepseek",
  图片: "jimeng",
  视频: "kling",
  海报: "jimeng",
  PPT: "zhipu"
};
const skillModeById: Record<string, WorkspaceMode> = {
  "free-chat": "聊天",
  "longform-article": "文章",
  "xiaohongshu-note": "文章",
  "taobao-detail": "电商",
  "douyin-script": "视频",
  "image-visual-brief": "图片",
  "poster-layout": "海报",
  "ppt-outline": "PPT",
  "compliance-check": "文章"
};
const skillCategoryModes: Record<string, WorkspaceMode> = {
  聊天: "聊天",
  文章: "文章",
  自媒体: "文章",
  电商: "电商",
  视频: "视频",
  视觉: "图片",
  图片: "图片",
  海报: "海报",
  PPT: "PPT",
  经营: "PPT",
  合规: "文章"
};
const builtInToolSkillIds = new Set([
  "tool-polish-rewrite",
  "tool-translate",
  "tool-expand-article",
  "tool-outline",
  "tool-title-ideas",
  "tool-proofread"
]);

function modeForSkill(skill?: RouteSkill): WorkspaceMode {
  if (!skill) return "聊天";
  return skillModeById[skill.id.replace(/^market-/, "")] ?? skillCategoryModes[skill.category] ?? "聊天";
}

function modelIdForSkill(skill: RouteSkill | undefined, mode: WorkspaceMode) {
  if (!skill) return modeDefaultModelIds[mode] ?? "auto";

  const directModel = modelEngines.find((model) => model.name === skill.recommendedModel);
  if (directModel) return directModel.id;

  if (skill.recommendedModel.includes("DeepSeek")) return "deepseek";
  if (skill.recommendedModel.includes("通义")) return "qwen";
  if (skill.recommendedModel.includes("智谱")) return "zhipu";
  if (skill.recommendedModel.includes("豆包")) return "doubao";
  if (skill.recommendedModel.includes("ChatGPT") || skill.recommendedModel.includes("OpenAI") || skill.recommendedModel.includes("GPT")) return "openai";
  if (skill.recommendedModel.includes("Claude")) return "claude";
  if (skill.recommendedModel.includes("Gemini")) return "gemini";
  if (skill.recommendedModel.includes("MiniMax")) return "minimax";
  if (skill.recommendedModel.includes("可灵")) return "kling";
  if (skill.recommendedModel.includes("即梦")) return "jimeng";
  if (skill.recommendedModel.includes("自动")) return "auto";

  return modeDefaultModelIds[mode] ?? "auto";
}

function skillNeedsProductContext(skill?: RouteSkill) {
  if (!skill) return false;

  const categoryNeedsProduct = ["电商", "自媒体", "视觉", "图片", "视频", "海报"].includes(skill.category);
  const fieldNeedsProduct = skill.fields.some((field) => field.includes("商品") || field.includes("卖点"));
  return categoryNeedsProduct || fieldNeedsProduct;
}

function isUploadedSkill(skill: RouteSkill) {
  return skill.source === "uploaded";
}

function isBuiltInToolSkill(skill: RouteSkill) {
  return builtInToolSkillIds.has(skill.id);
}

function isToolSkill(skill: RouteSkill) {
  return isBuiltInToolSkill(skill) || skill.source === "uploaded" || skill.source === "custom" || skill.source === "market";
}

function isPrimaryRouteSkill(skill: RouteSkill) {
  return !isUploadedSkill(skill) && !isBuiltInToolSkill(skill);
}

function visualSettingsFor(styleId: string, aspectRatio: VisualAspectRatio): VisualGenerationSettings {
  const style = visualStylePresets.find((item) => item.id === styleId) ?? visualStylePresets[0];
  return {
    aspectRatio,
    styleId: style.id,
    styleName: style.name,
    stylePrompt: style.prompt,
    lockStyle: true,
    characterProfileId: initialCharacterProfiles[0].id,
    characterVersion: initialCharacterProfiles[0].version,
    characterLock: true,
    characterName: initialCharacterProfiles[0].name,
    characterReferenceUrl: initialCharacterProfiles[0].identity.faceReferenceUrls[0],
    referenceFaceUrls: initialCharacterProfiles[0].identity.faceReferenceUrls,
    identityEncoder: initialCharacterProfiles[0].identity.encoder,
    identityVectorId: initialCharacterProfiles[0].identity.vectorId,
    identityDimensions: initialCharacterProfiles[0].identity.dimensions,
    identityConsistencyScore: initialCharacterProfiles[0].identity.consistencyScore,
    identityStrength: initialCharacterProfiles[0].fusion.identity,
    characterStrength: initialCharacterProfiles[0].fusion.identity,
    seed: "",
    negativePrompt: "模糊，低质量，畸形，过曝，变形，噪点，换脸，脸部不一致",
    statePreset: "calm",
    styleStrength: initialCharacterProfiles[0].fusion.style,
    promptStrength: initialCharacterProfiles[0].fusion.prompt,
    stateStrength: initialCharacterProfiles[0].fusion.state,
    generationCount: 4,
    memorySceneIds: initialCharacterProfiles[0].memory.map((entry) => entry.id),
    characterLoraAssetId: initialLoraAssets[0].id,
    characterLoraName: initialLoraAssets[0].name,
    characterLoraId: initialLoraAssets[0].fileName,
    characterLoraUrl: initialLoraAssets[0].url,
    characterLoraBaseModel: initialLoraAssets[0].baseModel,
    characterLoraTriggerWords: initialLoraAssets[0].triggerWords,
    characterLoraWeight: initialLoraAssets[0].defaultWeight,
    ...style.lora
  };
}

type JobResponse = {
  task: GenerationTask;
  artifact?: Artifact;
  assistantMessage?: Message;
};

type ProductImportResponse = {
  imported: number;
  importedProducts: ProductProfile[];
  products: ProductProfile[];
};

type CampaignPackResponse = {
  packageId: string;
  channels: string[];
  artifacts: Artifact[];
  tasks: GenerationTask[];
  assistantMessage: Message;
};

type IntegrationStatus = {
  id: string;
  name: string;
  role: string;
  description: string;
  capability: string;
  baseUrlEnv: string;
  apiKeyEnv: string;
  status: "预留" | "待配置" | "可启用";
  configured: boolean;
  baseUrlConfigured: boolean;
  apiKeyConfigured: boolean;
};

type SearchResult = {
  id: string;
  kind: "商品" | "素材" | "路线" | "作品" | "任务" | "排期";
  title: string;
  subtitle: string;
  nav: NavKey;
  targetId: string;
};

type MetricSnapshot = {
  label: string;
  value: string;
  detail: string;
};

type AuthStatus = {
  auth: {
    adapter: "local" | "trusted-headers";
    source: string;
    productionReady: boolean;
    authenticated: boolean;
    trustedHeaders: string[];
    requiredEnv: string[];
    missingEnv: string[];
    warning?: string;
    note: string;
    role?: TeamMemberRole;
  };
  user: {
    email: string;
    name: string;
  };
};

type BillingSummary = {
  budgetCents: number;
  spentCents: number;
  percent: number;
  spentLabel: string;
  budgetLabel: string;
  eventCount: number;
  topProvider: string;
};

const defaultBillingSummary: BillingSummary = {
  budgetCents: 10_000,
  spentCents: 0,
  percent: 0,
  spentLabel: "¥0.00",
  budgetLabel: "¥100.00",
  eventCount: 0,
  topProvider: "暂无"
};

type SessionUser = {
  email: string;
  name: string;
};

type WorkspaceListItem = {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    products: number;
    artifacts: number;
    tasks: number;
    publishPlan: number;
  };
};

type WorkspaceDirectoryResponse = {
  user: SessionUser;
  activeWorkspaceId: string;
  workspaces: WorkspaceListItem[];
};

type WorkspaceSnapshotPayload = Partial<{
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  activeMode: WorkspaceMode;
  selectedProductId: string;
  selectedSkillId: string;
  selectedToolSkillId: string;
  selectedModelId: string;
  visualSettings: VisualGenerationSettings;
  messages: Message[];
  artifacts: Artifact[];
  tasks: GenerationTask[];
  products: ProductProfile[];
  materials: MaterialAsset[];
  loraAssets: LoraAsset[];
  characterProfiles: CharacterProfile[];
  selectedCharacterId: string;
  publishPlan: PublishPlanItem[];
  skills: RouteSkill[];
  providerConfigs: GatewayProviderConfig[];
  routingPolicy: ProviderRoutingPolicy;
}>;

type ModeGuide = {
  placeholder: string;
  template: string;
};

type ComplianceResult = {
  ok: boolean;
  riskLevel: "低" | "中" | "高";
  issues: Array<{
    id: string;
    label: string;
    text: string;
    suggestion: string;
  }>;
};

function sanitizeProvidersForBrowser(configs: GatewayProviderConfig[]) {
  return configs.map((config) => ({
    ...config,
    apiKey: config.apiKey ? "••••" : ""
  }));
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeSkillFilePayload(payload: unknown): RouteSkill[] {
  const source = asRecord(payload);
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(source?.skills)
      ? source.skills
      : source?.skill
        ? [source.skill]
        : source
          ? [source]
          : [];

  return rawItems.flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];

    const fields = Array.isArray(record.fields)
      ? record.fields.map((field) => String(field).trim()).filter(Boolean)
      : typeof record.fields === "string"
        ? record.fields.split(",").map((field) => field.trim()).filter(Boolean)
        : ["目标", "背景", "输出"];

    const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : "导入技能";

    return [{
      id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : nextId("skill"),
      name,
      category: typeof record.category === "string" && record.category.trim() ? record.category.trim() : "自定义",
      description: typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : "从本地 skill 文件导入的技能。",
      fields,
      recommendedModel: typeof record.recommendedModel === "string" && record.recommendedModel.trim()
        ? record.recommendedModel.trim()
        : "自动路由",
      score: typeof record.score === "string" && record.score.trim() ? record.score.trim() : "导入",
      source: "uploaded"
    }];
  });
}

function estimateCost(mode: WorkspaceMode) {
  if (mode === "视频") return "预估 1.20 元";
  if (mode === "图片") return "预估 0.60 元";
  if (mode === "海报") return "预估 0.80 元";
  if (mode === "PPT") return "预估 0.30 元";
  return "预估 0.08 元";
}

function modeGuideFor(mode: WorkspaceMode, product: ProductProfile): ModeGuide {
  const productName = product.name;
  const platform = product.platform;

  const guides: Record<WorkspaceMode, ModeGuide> = {
    聊天: {
      placeholder: "直接输入你想聊、想写、想整理或想生成的内容。",
      template: "我有一个想法还比较散，请先帮我整理目标、关键信息、可选方向和下一步动作。"
    },
    文章: {
      placeholder: "输入选题、观点、目标读者、字数和发布平台。",
      template: `请为「${productName}」写一篇面向${product.audience}的长文大纲，平台参考：${platform}。需要标题、开头、三级结构和结尾行动。`
    },
    电商: {
      placeholder: "输入要卖的商品、平台、促销阶段和核心卖点。",
      template: `请把「${productName}」生成一套电商转化内容：详情页首屏、小红书种草标题、抖音口播钩子和私域短文案。`
    },
    图片: {
      placeholder: "输入画面主体、使用场景、风格、比例和禁止元素。",
      template: `请为「${productName}」生成一张电商主图图片：主体清晰、场景明确、光线自然、构图稳定，并遵守右侧选择的比例和统一风格。`
    },
    视频: {
      placeholder: "输入平台、时长、人设、卖点和镜头风格。",
      template: `请为「${productName}」生成一条 30 秒短视频：包含画面节奏、镜头运动、字幕口播、封面方向和结尾转化动作。`
    },
    海报: {
      placeholder: "输入活动主题、主标题、卖点、尺寸和平台。",
      template: `请为「${productName}」生成一张电商海报：主标题清晰、卖点层级明确、商品主体突出，并遵守右侧选择的比例和统一风格。`
    },
    PPT: {
      placeholder: "输入提案对象、目标、预算、周期和希望页数。",
      template: `请为「${productName}」生成一份 8 页电商增长 PPT：背景、目标、用户洞察、内容策略、预算、排期和预期结果。`
    }
  };

  return guides[mode];
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cx(
        "status-pill",
        (status === "已完成" || status === "已接入" || status === "可启用" || status === "已发布" || status === "已上架" || status === "已加入") && "done",
        (status === "生成中" || status === "待发布" || status === "待审核" || status === "已邀请") && "running",
        (status === "失败" || status === "暂缓" || status === "已下架" || status === "已停用") && "failed"
      )}
    >
      {status}
    </span>
  );
}

function providerStatusText(status?: GenerationTask["providerStatus"]) {
  if (status === "demo") return "Demo";
  if (status === "fallback") return "Fallback";
  if (status === "submitted") return "已提交";
  if (status === "processing") return "处理中";
  if (status === "completed") return "已回传";
  if (status === "failed") return "失败";
  return "";
}

function artifactMediaUrl(artifact: Artifact) {
  const match = artifact.body.match(/^结果链接：(.+)$/m);
  return artifact.mediaUrl ?? match?.[1]?.trim();
}

function mediaKind(type: Artifact["type"] | GenerationTask["type"], url: string) {
  if (type === "视频" || /\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return "video";
  if (type === "图片" || type === "海报" || url.startsWith("data:image/") || /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(url)) {
    return "image";
  }
  return "file";
}

function MediaPreview({
  url,
  type,
  compact
}: {
  url?: string;
  type: Artifact["type"] | GenerationTask["type"];
  compact?: boolean;
}) {
  if (!url) return null;
  const kind = mediaKind(type, url);

  return (
    <div className={cx("media-preview", compact && "compact")}>
      {kind === "video" && (
        <video src={url} controls muted playsInline preload="metadata" />
      )}
      {kind === "image" && (
        <img src={url} alt={`${type}预览`} loading="lazy" />
      )}
      {kind === "file" && (
        <div className="media-file">
          <FileStack size={16} />
          <span>{type}结果</span>
        </div>
      )}
      <a href={url} target="_blank" rel="noreferrer">打开结果</a>
    </div>
  );
}

function teamRoleText(role: TeamMemberRole) {
  if (role === "owner") return "所有者";
  if (role === "admin") return "管理员";
  if (role === "editor") return "编辑";
  return "只读";
}

function teamStatusText(status: TeamMember["status"]) {
  if (status === "active") return "已加入";
  if (status === "invited") return "已邀请";
  return "已停用";
}

function keyVaultScopeText(scope: KeyVaultSecret["scope"]) {
  if (scope === "provider") return "模型";
  if (scope === "webhook") return "回调";
  if (scope === "payment") return "支付";
  if (scope === "integration") return "集成";
  return "自定义";
}

function paymentSessionStatusText(status: PaymentSession["status"]) {
  if (status === "paid") return "已支付";
  if (status === "cancelled") return "已取消";
  return "待支付";
}

function authAdapterText(adapter: AuthStatus["auth"]["adapter"]) {
  return adapter === "trusted-headers" ? "网关认证" : "本地会话";
}

function formatCnyFromCents(value: number) {
  return `¥${(value / 100).toFixed(2)}`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatPublishDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export {
  defaultPrompt,
  appStorageKey,
  asyncModes,
  visualControlModes,
  modeDefaultModelIds,
  skillModeById,
  skillCategoryModes,
  builtInToolSkillIds,
  defaultBillingSummary,
  modeForSkill,
  modelIdForSkill,
  skillNeedsProductContext,
  isUploadedSkill,
  isBuiltInToolSkill,
  isToolSkill,
  isPrimaryRouteSkill,
  visualSettingsFor,
  sanitizeProvidersForBrowser,
  cx,
  nextId,
  asRecord,
  normalizeSkillFilePayload,
  estimateCost,
  modeGuideFor,
  providerStatusText,
  artifactMediaUrl,
  mediaKind,
  teamRoleText,
  teamStatusText,
  keyVaultScopeText,
  paymentSessionStatusText,
  authAdapterText,
  formatCnyFromCents,
  formatBytes,
  formatPublishDate,
  StatusPill,
  MediaPreview
};
export type {
  JobResponse,
  ProductImportResponse,
  CampaignPackResponse,
  IntegrationStatus,
  SearchResult,
  MetricSnapshot,
  AuthStatus,
  BillingSummary,
  SessionUser,
  WorkspaceListItem,
  WorkspaceDirectoryResponse,
  WorkspaceSnapshotPayload,
  ModeGuide,
  ComplianceResult
};
