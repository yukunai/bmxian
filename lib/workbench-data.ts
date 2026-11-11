import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Boxes,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  FileStack,
  FileText,
  Film,
  Image,
  Layers3,
  Library,
  MessageSquareText,
  PackageOpen,
  PenLine,
  Route,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  WandSparkles,
  Workflow
} from "lucide-react";

export type WorkspaceMode = "聊天" | "文章" | "电商" | "图片" | "视频" | "海报" | "PPT";

export type NavKey =
  | "studio"
  | "products"
  | "materials"
  | "skills"
  | "models"
  | "assets"
  | "calendar"
  | "tasks"
  | "settings";

export type ProductProfile = {
  id: string;
  name: string;
  category: string;
  price: string;
  audience: string;
  stage: string;
  platform: string;
  tone: string;
  assets: number;
  notes: string[];
};

export type MaterialAsset = {
  id: string;
  name: string;
  kind: "图片" | "视频" | "文档" | "其他";
  mimeType: string;
  size: number;
  url: string;
  tags: string[];
  createdAt: string;
};

export type LoraAsset = {
  id: string;
  name: string;
  kind: "角色" | "风格" | "商品" | "通用";
  baseModel: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  previewUrl?: string;
  triggerWords: string[];
  defaultWeight: number;
  status: "可用" | "待训练" | "停用";
  createdAt: string;
};

export type CharacterIdentityModel = {
  encoder: "InsightFace" | "ArcFace" | "ViT";
  vectorId: string;
  dimensions: number;
  faceReferenceUrls: string[];
  strength: number;
  consistencyScore: number;
  structure: {
    eyeDistance: string;
    jawShape: string;
    noseBridge: string;
    ageRange: string;
  };
};

export type CharacterStyleModel = {
  presetId: string;
  styleName: string;
  styleVectorId: string;
  strength: number;
  loraAssetId?: string;
  triggerWords: string[];
};

export type CharacterMemoryEntry = {
  id: string;
  scene: string;
  prompt: string;
  pose: string;
  successScore: number;
  imageUrl?: string;
  createdAt: string;
};

export type CharacterFusionWeights = {
  identity: number;
  style: number;
  prompt: number;
  state: number;
};

export type CharacterProfile = {
  id: string;
  name: string;
  archetype: "Realistic" | "Anime" | "Commercial" | "Brand IP";
  status: "可用" | "训练中" | "需补图";
  thumbnailUrl?: string;
  identity: CharacterIdentityModel;
  style: CharacterStyleModel;
  memory: CharacterMemoryEntry[];
  fusion: CharacterFusionWeights;
  version: string;
  lastUsedAt: string;
  createdAt: string;
};

export type RouteSkill = {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: string[];
  recommendedModel: string;
  score: string;
  source?: "built-in" | "custom" | "market" | "uploaded";
};

export type MarketplaceSkill = RouteSkill & {
  author: string;
  installs: string;
  price: "免费" | "付费";
  tags: string[];
  status?: "已上架" | "待审核" | "已下架";
  version?: string;
  publisherSkillId?: string;
  publishedAt?: string;
  reviewNote?: string;
};

export type ModelEngine = {
  id: string;
  name: string;
  provider: string;
  lane: string;
  latency: string;
  cost: string;
  status: "已接入" | "待配置" | "预留";
  strengths: string[];
};

export type VisualAspectRatio = "16:9" | "9:16" | "3:4" | "1:1" | "21:9";

export type VisualStylePreset = {
  id: string;
  name: string;
  scene: string;
  description: string;
  prompt: string;
  thumbnailClass: string;
  lora: VisualLoraReservation;
};

export type VisualLoraReservation = {
  styleLoraId: string;
  loraWeight: number;
  triggerWords: string[];
  baseModel: string;
  referenceImage: string;
  styleVersion: string;
};

export type VisualGenerationSettings = {
  aspectRatio: VisualAspectRatio;
  styleId: string;
  styleName: string;
  stylePrompt: string;
  lockStyle: boolean;
  characterProfileId?: string;
  characterVersion?: string;
  characterLock: boolean;
  characterName?: string;
  characterReferenceUrl?: string;
  referenceFaceUrls?: string[];
  identityEncoder?: string;
  identityVectorId?: string;
  identityDimensions?: number;
  identityConsistencyScore?: number;
  identityStrength?: number;
  characterStrength?: number;
  seed?: string;
  negativePrompt?: string;
  statePreset?: string;
  styleStrength?: number;
  promptStrength?: number;
  stateStrength?: number;
  generationCount?: 1 | 2 | 4 | 8;
  memorySceneIds?: string[];
  characterLoraAssetId?: string;
  characterLoraName?: string;
  characterLoraId?: string;
  characterLoraUrl?: string;
  characterLoraBaseModel?: string;
  characterLoraTriggerWords?: string[];
  characterLoraWeight?: number;
  styleLoraId?: string;
  loraWeight?: number;
  triggerWords?: string[];
  baseModel?: string;
  referenceImage?: string;
  styleVersion?: string;
};

export type Artifact = {
  id: string;
  type: WorkspaceMode | "海报" | "商品";
  title: string;
  source: string;
  body: string;
  status: "草稿" | "已保存" | "待复核";
  mediaUrl?: string;
};

export type GenerationTask = {
  id: string;
  title: string;
  type: WorkspaceMode | "合规";
  modelId?: string;
  model: string;
  cost: string;
  status: "排队中" | "生成中" | "已完成" | "失败";
  progress?: number;
  artifactId?: string;
  prompt?: string;
  productName?: string;
  skillName?: string;
  visualSettings?: VisualGenerationSettings;
  providerId?: string;
  providerLabel?: string;
  providerStatus?: "demo" | "submitted" | "processing" | "completed" | "failed" | "fallback";
  externalJobId?: string;
  providerWarning?: string;
  providerResultUrl?: string;
  resultAssetUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UsageEvent = {
  id: string;
  taskId: string;
  mode: WorkspaceMode | "合规";
  model: string;
  providerId?: string;
  providerLabel?: string;
  amountCents: number;
  currency: "CNY";
  status: "estimated" | "final" | "refunded";
  createdAt: string;
};

export type SupplierInvoice = {
  id: string;
  providerId?: string;
  providerLabel: string;
  period: string;
  amountCents: number;
  currency: "CNY";
  externalInvoiceId?: string;
  source: "manual" | "csv" | "json";
  lineCount: number;
  notes: string[];
  importedAt: string;
};

export type PaymentSessionStatus = "pending" | "paid" | "cancelled";

export type PaymentSession = {
  id: string;
  invoiceId: string;
  period: string;
  amountCents: number;
  currency: "CNY";
  provider: string;
  status: PaymentSessionStatus;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  cancelledAt?: string;
  note?: string;
};

export type KeyVaultSecretScope = "provider" | "webhook" | "payment" | "integration" | "custom";

export type KeyVaultSecret = {
  id: string;
  name: string;
  scope: KeyVaultSecretScope;
  linkedId?: string;
  maskedValue: string;
  secretCiphertext?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastUsedAt?: string;
};

export type TeamMemberRole = "owner" | "admin" | "editor" | "viewer";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: "active" | "invited" | "disabled";
  createdAt: string;
};

export type PublishPlanItem = {
  id: string;
  artifactId: string;
  title: string;
  channel: "小红书" | "抖音" | "淘宝" | "视频号" | "私域";
  productName: string;
  publishAt: string;
  status: "待发布" | "已发布" | "暂缓";
  note: string;
  createdAt: string;
};

export type MarketplacePublishStatus = "已上架" | "待审核" | "已下架";

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: string;
};

export type NavItem = {
  id: NavKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { id: "studio", label: "创作台", description: "聊天和任务流", icon: MessageSquareText },
  { id: "products", label: "商品档案", description: "电商资料", icon: PackageOpen },
  { id: "materials", label: "素材库", description: "图片和文件", icon: Upload },
  { id: "skills", label: "路线库", description: "技能和工作流", icon: Route },
  { id: "models", label: "引擎中心", description: "模型路由", icon: BrainCircuit },
  { id: "assets", label: "作品集", description: "内容资产", icon: Library },
  { id: "calendar", label: "发布计划", description: "排期和渠道", icon: CalendarDays },
  { id: "tasks", label: "任务流", description: "异步生成", icon: Workflow },
  { id: "settings", label: "设置", description: "密钥和团队", icon: Settings2 }
];

export const modes: Array<{ id: WorkspaceMode; icon: LucideIcon; hint: string }> = [
  { id: "聊天", icon: MessageSquareText, hint: "自由创作" },
  { id: "文章", icon: FileText, hint: "长文结构" },
  { id: "电商", icon: Store, hint: "商品转化" },
  { id: "图片", icon: Image, hint: "主图海报" },
  { id: "视频", icon: Film, hint: "脚本分镜" },
  { id: "海报", icon: Layers3, hint: "版式方案" },
  { id: "PPT", icon: FileStack, hint: "提案大纲" }
];

export const visualAspectRatios: Array<{ id: VisualAspectRatio; label: string; hint: string }> = [
  { id: "16:9", label: "16:9", hint: "横版封面" },
  { id: "9:16", label: "9:16", hint: "竖屏短视频" },
  { id: "3:4", label: "3:4", hint: "详情页海报" },
  { id: "1:1", label: "1:1", hint: "方形主图" },
  { id: "21:9", label: "21:9", hint: "宽屏横幅" }
];

export const visualStylePresets: VisualStylePreset[] = [
  {
    id: "clean-commerce",
    name: "清透商品主图",
    scene: "电商主图",
    description: "浅底、自然光、主体清晰，适合详情页和平台主图。",
    prompt: "统一使用浅色干净电商棚拍风格，自然柔光，产品主体清晰，背景低干扰，少量精致卖点标签，画面干净可信。",
    thumbnailClass: "thumb-clean-commerce",
    lora: {
      styleLoraId: "reserved-clean-commerce-v1",
      loraWeight: 0.68,
      triggerWords: ["bmxian_clean_commerce", "clean product lighting"],
      baseModel: "image-base-commerce",
      referenceImage: "style://clean-commerce/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "premium-detail",
    name: "高级详情质感",
    scene: "详情页",
    description: "深浅对比、材质特写、留白高级，适合高客单商品。",
    prompt: "统一使用高级详情页质感，强调材质纹理、层次光影和留白，构图稳定，文字区清晰，整体精致克制。",
    thumbnailClass: "thumb-premium-detail",
    lora: {
      styleLoraId: "reserved-premium-detail-v1",
      loraWeight: 0.72,
      triggerWords: ["bmxian_premium_detail", "premium material lighting"],
      baseModel: "image-base-commerce",
      referenceImage: "style://premium-detail/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "xiaohongshu-lifestyle",
    name: "小红书生活感",
    scene: "种草图",
    description: "真实生活场景、轻柔色彩、像自然拍摄的种草图片。",
    prompt: "统一使用小红书生活方式摄影风格，真实场景、自然采光、轻柔色彩、轻微胶片质感，像用户真实使用分享。",
    thumbnailClass: "thumb-xiaohongshu",
    lora: {
      styleLoraId: "reserved-xiaohongshu-lifestyle-v1",
      loraWeight: 0.62,
      triggerWords: ["bmxian_xhs_lifestyle", "soft lifestyle photo"],
      baseModel: "image-base-lifestyle",
      referenceImage: "style://xiaohongshu-lifestyle/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "sale-impact",
    name: "爆款促销海报",
    scene: "活动促销",
    description: "强对比、价格区醒目、卖点冲击，适合大促和直播间。",
    prompt: "统一使用高转化促销海报风格，强对比色块，价格和利益点清晰醒目，产品主体突出，节奏直接但不杂乱。",
    thumbnailClass: "thumb-sale-impact",
    lora: {
      styleLoraId: "reserved-sale-impact-v1",
      loraWeight: 0.75,
      triggerWords: ["bmxian_sale_impact", "bold promo poster"],
      baseModel: "image-base-poster",
      referenceImage: "style://sale-impact/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "tech-launch",
    name: "科技发布感",
    scene: "3C 数码",
    description: "暗色舞台、轮廓光、参数感，适合科技和家电新品。",
    prompt: "统一使用科技新品发布视觉，暗色背景、轮廓光、精密材质、参数信息排版，整体专业、有未来感。",
    thumbnailClass: "thumb-tech-launch",
    lora: {
      styleLoraId: "reserved-tech-launch-v1",
      loraWeight: 0.7,
      triggerWords: ["bmxian_tech_launch", "dark launch lighting"],
      baseModel: "image-base-tech",
      referenceImage: "style://tech-launch/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "minimal-editorial",
    name: "杂志极简版式",
    scene: "品牌形象",
    description: "大留白、轻排版、弱装饰，适合品牌感海报和封面。",
    prompt: "统一使用杂志极简版式，大面积留白，克制配色，产品和标题层级清楚，画面像高端品牌 editorial。",
    thumbnailClass: "thumb-minimal-editorial",
    lora: {
      styleLoraId: "reserved-minimal-editorial-v1",
      loraWeight: 0.58,
      triggerWords: ["bmxian_minimal_editorial", "minimal editorial layout"],
      baseModel: "image-base-editorial",
      referenceImage: "style://minimal-editorial/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "outdoor-fresh",
    name: "户外清新场景",
    scene: "服饰户外",
    description: "天空、绿植、自然运动感，适合户外和防晒商品。",
    prompt: "统一使用户外清新场景风格，明亮自然光，轻运动氛围，蓝绿自然背景，突出舒适、轻盈和使用场景。",
    thumbnailClass: "thumb-outdoor-fresh",
    lora: {
      styleLoraId: "reserved-outdoor-fresh-v1",
      loraWeight: 0.64,
      triggerWords: ["bmxian_outdoor_fresh", "bright outdoor product"],
      baseModel: "image-base-lifestyle",
      referenceImage: "style://outdoor-fresh/reference-v1",
      styleVersion: "v1"
    }
  },
  {
    id: "soft-beauty",
    name: "柔和美妆质感",
    scene: "美妆个护",
    description: "柔光、细腻渐层、干净容器特写，适合个护与美妆。",
    prompt: "统一使用柔和美妆质感，细腻柔光，浅色渐层背景，产品边缘清晰，画面干净、温柔、有高级感。",
    thumbnailClass: "thumb-soft-beauty",
    lora: {
      styleLoraId: "reserved-soft-beauty-v1",
      loraWeight: 0.66,
      triggerWords: ["bmxian_soft_beauty", "soft beauty product"],
      baseModel: "image-base-beauty",
      referenceImage: "style://soft-beauty/reference-v1",
      styleVersion: "v1"
    }
  }
];

export const initialLoraAssets: LoraAsset[] = [
  {
    id: "lora-character-default",
    name: "角色一致性 LoRA",
    kind: "角色",
    baseModel: "SDXL / FLUX compatible",
    fileName: "default-character-v1.safetensors",
    mimeType: "application/octet-stream",
    size: 0,
    url: "lora://local/character/default-character-v1.safetensors",
    previewUrl: "style://character/default-preview-v1",
    triggerWords: ["consistent_character", "same female character"],
    defaultWeight: 0.72,
    status: "可用",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "lora-commerce-model-clean",
    name: "备用角色 LoRA",
    kind: "角色",
    baseModel: "SDXL / FLUX compatible",
    fileName: "alternate-character-v1.safetensors",
    mimeType: "application/octet-stream",
    size: 0,
    url: "lora://local/character/alternate-character-v1.safetensors",
    previewUrl: "style://character/alternate-preview-v1",
    triggerWords: ["alternate_character", "consistent e-commerce model"],
    defaultWeight: 0.68,
    status: "可用",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];

export const initialCharacterProfiles: CharacterProfile[] = [
  {
    id: "char-default",
    name: "默认角色",
    archetype: "Commercial",
    status: "可用",
    thumbnailUrl: "style://character/default-preview-v1",
    identity: {
      encoder: "InsightFace",
      vectorId: "identity-default-1024-v1",
      dimensions: 1024,
      faceReferenceUrls: [
        "style://character/default-face-01",
        "style://character/default-face-02",
        "style://character/default-face-03"
      ],
      strength: 0.85,
      consistencyScore: 92,
      structure: {
        eyeDistance: "balanced",
        jawShape: "soft oval",
        noseBridge: "medium high",
        ageRange: "24-28"
      }
    },
    style: {
      presetId: "clean-commerce",
      styleName: "清透商品主图",
      styleVectorId: "style-clean-commerce-v1",
      strength: 0.62,
      loraAssetId: "lora-character-default",
      triggerWords: ["consistent_character", "clean product lighting"]
    },
    memory: [
      {
        id: "mem-default-portrait",
        scene: "studio headshot",
        prompt: "front portrait, soft daylight, clean background",
        pose: "front",
        successScore: 94,
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "mem-default-park",
        scene: "morning park",
        prompt: "walking in morning light, soft outdoor bokeh",
        pose: "three-quarter",
        successScore: 90,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    fusion: {
      identity: 0.85,
      style: 0.62,
      prompt: 1,
      state: 0.42
    },
    version: "v1",
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "char-alt",
    name: "角色 02",
    archetype: "Brand IP",
    status: "可用",
    thumbnailUrl: "style://character/alt-preview-v1",
    identity: {
      encoder: "ArcFace",
      vectorId: "identity-alt-512-v1",
      dimensions: 512,
      faceReferenceUrls: ["style://character/alt-face-01", "style://character/alt-face-02"],
      strength: 0.8,
      consistencyScore: 88,
      structure: {
        eyeDistance: "wide balanced",
        jawShape: "defined",
        noseBridge: "straight",
        ageRange: "28-34"
      }
    },
    style: {
      presetId: "tech-launch",
      styleName: "科技发布感",
      styleVectorId: "style-tech-launch-v1",
      strength: 0.66,
      triggerWords: ["bmxian_tech_launch", "dark launch lighting"]
    },
    memory: [
      {
        id: "mem-alt-launch",
        scene: "product launch stage",
        prompt: "commercial tech presenter, rim light, product stage",
        pose: "half body",
        successScore: 89,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    fusion: {
      identity: 0.8,
      style: 0.66,
      prompt: 1,
      state: 0.38
    },
    version: "v1",
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];

export const defaultVisualGenerationSettings: VisualGenerationSettings = {
  aspectRatio: "3:4",
  styleId: visualStylePresets[0].id,
  styleName: visualStylePresets[0].name,
  stylePrompt: visualStylePresets[0].prompt,
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
  ...visualStylePresets[0].lora
};

export const productProfiles: ProductProfile[] = [
  {
    id: "suncoat",
    name: "轻薄防晒衣 2026",
    category: "服饰 / 户外",
    price: "199-299 元",
    audience: "通勤女性、户外旅行用户",
    stage: "618 预热",
    platform: "淘宝 / 小红书 / 抖音",
    tone: "清爽、可信、强调体感",
    assets: 18,
    notes: ["UPF50+ 防护", "冰感面料", "可收纳帽檐", "通勤和旅行两用"]
  },
  {
    id: "coffee",
    name: "冷萃咖啡液",
    category: "食品饮料",
    price: "69 元 / 12 条",
    audience: "办公室白领、健身人群",
    stage: "新品测款",
    platform: "小红书 / 视频号",
    tone: "利落、生活方式、低负担",
    assets: 11,
    notes: ["0 蔗糖", "3 秒冷萃", "可搭配牛奶", "适合下午提神"]
  },
  {
    id: "lamp",
    name: "护眼学习台灯 Pro",
    category: "家居 / 3C",
    price: "399-499 元",
    audience: "学生家庭、书桌办公人群",
    stage: "详情页重做",
    platform: "京东 / 天猫",
    tone: "专业、家长安心、参数清晰",
    assets: 24,
    notes: ["全光谱", "无频闪", "自动调光", "儿童房和书房适用"]
  }
];

export const routeSkills: RouteSkill[] = [
  {
    id: "free-chat",
    name: "自由创作助理",
    category: "聊天",
    description: "把零散想法整理成可执行的内容方向，适合问答、头脑风暴和临时改稿。",
    fields: ["目标", "背景", "限制", "输出格式"],
    recommendedModel: "自动路由",
    score: "通用"
  },
  {
    id: "longform-article",
    name: "长文结构拆解",
    category: "文章",
    description: "把选题拆成标题、观点、结构、案例和结尾行动，适合公众号、知乎和品牌长文。",
    fields: ["选题", "受众", "观点", "字数"],
    recommendedModel: "通义长文",
    score: "长文"
  },
  {
    id: "xiaohongshu-note",
    name: "小红书爆款笔记",
    category: "自媒体",
    description: "把商品卖点改写成真实体验感笔记，自动生成标题、正文和话题标签。",
    fields: ["商品", "人群", "使用场景", "语气"],
    recommendedModel: "DeepSeek 写作",
    score: "复用率 86%"
  },
  {
    id: "taobao-detail",
    name: "淘宝详情页结构",
    category: "电商",
    description: "从商品档案生成详情页首屏、卖点分区、痛点对照和 FAQ。",
    fields: ["商品", "卖点", "竞品", "平台"],
    recommendedModel: "通义长文",
    score: "转化素材"
  },
  {
    id: "douyin-script",
    name: "视频生成",
    category: "视频",
    description: "根据商品、平台、时长和镜头风格直接创建视频生成任务。",
    fields: ["商品", "平台", "时长", "风格"],
    recommendedModel: "可灵视频",
    score: "成片"
  },
  {
    id: "image-visual-brief",
    name: "图片生成",
    category: "图片",
    description: "根据商品、场景、比例和统一风格直接创建图片生成任务。",
    fields: ["主体", "场景", "风格", "比例"],
    recommendedModel: "即梦视觉",
    score: "出图"
  },
  {
    id: "poster-layout",
    name: "海报生成",
    category: "海报",
    description: "根据活动主题、商品卖点、平台尺寸和统一风格直接创建海报生成任务。",
    fields: ["商品", "主题", "卖点", "尺寸"],
    recommendedModel: "即梦视觉",
    score: "出图"
  },
  {
    id: "ppt-outline",
    name: "PPT 生成",
    category: "PPT",
    description: "根据商品、目标、受众和页数直接创建可交付的 PPT 生成任务。",
    fields: ["目标", "受众", "页数", "周期"],
    recommendedModel: "智谱 GLM",
    score: "成稿"
  },
  {
    id: "compliance-check",
    name: "广告法风险检查",
    category: "合规",
    description: "检查绝对化用词、功效暗示、平台敏感表达，并给替代表述。",
    fields: ["内容", "类目", "平台"],
    recommendedModel: "混元审核",
    score: "风险控制"
  },
  {
    id: "tool-polish-rewrite",
    name: "润色改写",
    category: "文章",
    description: "把原文改得更顺、更自然，保留核心意思。",
    fields: ["原文", "语气", "目标读者"],
    recommendedModel: "通义长文",
    score: "常用",
    source: "built-in"
  },
  {
    id: "tool-translate",
    name: "翻译",
    category: "文章",
    description: "在中文、英文和常用跨境电商语境之间翻译内容。",
    fields: ["原文", "目标语言", "使用场景"],
    recommendedModel: "ChatGPT / OpenAI",
    score: "常用",
    source: "built-in"
  },
  {
    id: "tool-expand-article",
    name: "扩写成文",
    category: "文章",
    description: "把短观点、提纲或碎片素材扩写成完整段落。",
    fields: ["观点", "受众", "篇幅"],
    recommendedModel: "通义长文",
    score: "长文",
    source: "built-in"
  },
  {
    id: "tool-outline",
    name: "整理提纲",
    category: "文章",
    description: "把零散想法整理成标题、结构和下一步写作提纲。",
    fields: ["想法", "目标", "输出格式"],
    recommendedModel: "自动路由",
    score: "通用",
    source: "built-in"
  },
  {
    id: "tool-title-ideas",
    name: "标题优化",
    category: "文章",
    description: "根据内容生成更清楚、更有点击欲望的标题方向。",
    fields: ["正文", "平台", "风格"],
    recommendedModel: "DeepSeek 写作",
    score: "常用",
    source: "built-in"
  },
  {
    id: "tool-proofread",
    name: "错别字检查",
    category: "文章",
    description: "检查错别字、病句、重复表达和不自然的 AI 腔。",
    fields: ["原文", "检查重点"],
    recommendedModel: "自动路由",
    score: "校对",
    source: "built-in"
  }
];

export const marketplaceSkills: MarketplaceSkill[] = [
  {
    id: "live-conversion-script",
    name: "直播间促单脚本",
    category: "电商",
    description: "把商品卖点拆成开场钩子、痛点共鸣、证据展示、限时促单和评论区互动。",
    fields: ["商品", "价格", "人群", "促销机制"],
    recommendedModel: "DeepSeek 写作",
    score: "高转化",
    author: "Bmxian",
    installs: "2.4k",
    price: "免费",
    tags: ["直播", "转化", "话术"]
  },
  {
    id: "xiaohongshu-review-pack",
    name: "小红书测评矩阵",
    category: "自媒体",
    description: "生成 5 条不同角度的种草笔记，包括真实体验、避坑、对比、场景和清单。",
    fields: ["商品", "体验场景", "竞品", "口吻"],
    recommendedModel: "通义长文",
    score: "内容矩阵",
    author: "Bmxian",
    installs: "3.1k",
    price: "免费",
    tags: ["小红书", "测评", "矩阵"]
  },
  {
    id: "poster-main-visual",
    name: "电商主视觉海报",
    category: "视觉",
    description: "输出主图海报、标题层级、卖点标签、生成指令和裁切安全区。",
    fields: ["商品图", "核心卖点", "平台", "活动主题"],
    recommendedModel: "即梦视觉",
    score: "视觉优先",
    author: "Bmxian",
    installs: "1.8k",
    price: "免费",
    tags: ["海报", "主图", "视觉"]
  },
  {
    id: "short-video-storyboard",
    name: "短视频分镜脚本",
    category: "视频",
    description: "生成 15 秒、30 秒、60 秒三档视频分镜，包含画面、字幕、口播和镜头节奏。",
    fields: ["商品", "平台", "时长", "卖点"],
    recommendedModel: "豆包内容",
    score: "视频预留",
    author: "Bmxian",
    installs: "1.2k",
    price: "免费",
    tags: ["短视频", "分镜", "口播"]
  },
  {
    id: "merchant-pitch-deck",
    name: "商家提案 PPT",
    category: "经营",
    description: "把商品、平台、预算和节奏整理成适合团队复盘或客户提案的 PPT 草稿。",
    fields: ["商品", "目标", "预算", "周期"],
    recommendedModel: "智谱 GLM",
    score: "提案",
    author: "Bmxian",
    installs: "860",
    price: "免费",
    tags: ["PPT", "提案", "复盘"]
  }
];

export const modelEngines: ModelEngine[] = [
  {
    id: "auto",
    name: "自动路由",
    provider: "斑马线",
    lane: "默认",
    latency: "按任务选择",
    cost: "动态估算",
    status: "已接入",
    strengths: ["任务识别", "成本控制", "失败重试"]
  },
  {
    id: "deepseek",
    name: "DeepSeek 写作",
    provider: "DeepSeek",
    lane: "文本 / 结构",
    latency: "快",
    cost: "低",
    status: "待配置",
    strengths: ["长文推理", "中文表达", "结构化输出"]
  },
  {
    id: "qwen",
    name: "通义长文",
    provider: "阿里云百炼",
    lane: "文本 / 多模态",
    latency: "中",
    cost: "中",
    status: "待配置",
    strengths: ["电商文本", "企业稳定性", "多模态扩展"]
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    provider: "智谱 AI",
    lane: "文本 / 结构",
    latency: "中",
    cost: "中",
    status: "待配置",
    strengths: ["中文长文", "结构化输出", "企业接入"]
  },
  {
    id: "doubao",
    name: "豆包内容",
    provider: "火山方舟",
    lane: "内容 / 视频预留",
    latency: "快",
    cost: "中",
    status: "待配置",
    strengths: ["短内容", "国内平台语感", "视觉生态"]
  },
  {
    id: "openai",
    name: "ChatGPT / OpenAI",
    provider: "OpenAI",
    lane: "文本 / 通用",
    latency: "中",
    cost: "中高",
    status: "待配置",
    strengths: ["通用创作", "复杂指令", "英文内容"]
  },
  {
    id: "claude",
    name: "Claude",
    provider: "Anthropic",
    lane: "文本 / 长文",
    latency: "中",
    cost: "中高",
    status: "待配置",
    strengths: ["长上下文", "文案润色", "结构审稿"]
  },
  {
    id: "gemini",
    name: "Gemini",
    provider: "Google",
    lane: "文本 / 多模态",
    latency: "中",
    cost: "中",
    status: "待配置",
    strengths: ["通用生成", "跨模态扩展", "资料整理"]
  },
  {
    id: "minimax",
    name: "MiniMax",
    provider: "MiniMax",
    lane: "文本 / 中文",
    latency: "快",
    cost: "中",
    status: "待配置",
    strengths: ["中文对话", "角色表达", "内容生成"]
  },
  {
    id: "kling",
    name: "可灵视频",
    provider: "快手可灵",
    lane: "视频",
    latency: "异步",
    cost: "高",
    status: "预留",
    strengths: ["图生视频", "文生视频", "镜头生成"]
  },
  {
    id: "jimeng",
    name: "即梦视觉",
    provider: "火山引擎",
    lane: "图片 / 视频",
    latency: "异步",
    cost: "中高",
    status: "预留",
    strengths: ["海报草图", "视觉素材", "视频扩展"]
  },
  {
    id: "midjourney",
    name: "Midjourney",
    provider: "Midjourney 网关",
    lane: "图片 / 角色一致性",
    latency: "异步",
    cost: "高",
    status: "预留",
    strengths: ["角色参考", "风格化", "海报视觉"]
  },
  {
    id: "flux",
    name: "FLUX",
    provider: "Black Forest Labs",
    lane: "图片 / 参考图",
    latency: "异步",
    cost: "中高",
    status: "预留",
    strengths: ["多参考图", "角色保持", "商品视觉"]
  },
  {
    id: "gpt-image",
    name: "GPT Image",
    provider: "OpenAI",
    lane: "图片 / 编辑生成",
    latency: "异步",
    cost: "中高",
    status: "预留",
    strengths: ["指令理解", "参考图编辑", "图文一致"]
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion + LoRA",
    provider: "Stability / SD Gateway",
    lane: "图片 / LoRA",
    latency: "异步",
    cost: "中",
    status: "预留",
    strengths: ["LoRA 角色", "Seed 固定", "可控工作流"]
  }
];

export const initialArtifacts: Artifact[] = [
  {
    id: "a1",
    type: "电商",
    title: "防晒衣商品卖点改写",
    source: "轻薄防晒衣 2026",
    status: "已保存",
    body: "把 UPF50+、冰感面料和可收纳帽檐重组为三段式卖点：通勤不闷、旅行不晒、收纳不占包。"
  },
  {
    id: "a2",
    type: "文章",
    title: "小红书种草笔记草稿",
    source: "小红书爆款笔记",
    status: "草稿",
    body: "标题候选：这件防晒衣救了我的夏天通勤。正文采用真实体验开头，接通勤、旅行、午间外出三个场景。"
  },
  {
    id: "a3",
    type: "视频",
    title: "30 秒视频生成",
    source: "视频生成",
    status: "待复核",
    body: "0-3 秒痛点开场，3-18 秒展示帽檐、袖口和冰感面料，18-30 秒给出使用场景、封面方向和转化动作。"
  }
];

export const initialTasks: GenerationTask[] = [
  {
    id: "t1",
    title: "防晒衣小红书笔记生成",
    type: "文章",
    model: "DeepSeek 写作",
    cost: "0.18 元",
    status: "已完成"
  },
  {
    id: "t2",
    title: "商品海报方向生成",
    type: "图片",
    model: "即梦视觉",
    cost: "预估 0.80 元",
    status: "排队中"
  },
  {
    id: "t3",
    title: "广告法风险检查",
    type: "合规",
    model: "自动路由",
    cost: "0.04 元",
    status: "已完成"
  }
];

export const initialMessages: Message[] = [
  {
    id: "m1",
    role: "assistant",
    text: "这里是斑马线创作台。你可以先像聊天一样把想法丢进来，我会帮你整理、改写、扩写，或者再按需要切换到文章、电商、图片、视频、海报、PPT 等技能。",
    meta: "系统"
  },
  {
    id: "m2",
    role: "user",
    text: "我现在只有一个模糊想法，还不知道该怎么拆。",
    meta: "示例需求"
  },
  {
    id: "m3",
    role: "assistant",
    text: "可以先不用选商品或复杂参数。直接说背景、目标、受众和你想要的结果；如果后面要做电商文案、海报或视频，再切换对应技能。",
    meta: "自由聊天"
  }
];

export const metricCards = [
  { label: "作品总数", value: "0", detail: "暂无作品", icon: Sparkles },
  { label: "已保存路线", value: "12", detail: "电商 5 / 自媒体 4 / 合规 3", icon: Route },
  { label: "模型成本", value: "¥28.40", detail: "比手动路由低 18%", icon: BadgeCheck },
  { label: "素材资产", value: "156", detail: "商品图、海报、脚本和文章", icon: Boxes }
];

export const pluginReservations = [
  {
    name: "Scenelet",
    role: "视频创作插件",
    description: "未来接入脚本转分镜、图生视频、短视频任务队列。第一版只预留 video.generate 接口。",
    icon: Film
  },
  {
    name: "LoamTrace",
    role: "可信写作插件",
    description: "未来接入资料核验、引用追踪、事实检查和报告/PPT 证据链。第一版只预留 source.verify 接口。",
    icon: ShieldCheck
  }
];

export const scenarioCards = [
  { title: "上新", text: "商品标题、主图文案、小红书首发稿", icon: Store },
  { title: "种草", text: "体验感笔记、话题标签、封面标题", icon: PenLine },
  { title: "投放", text: "卖点提炼、广告素材、合规检查", icon: BriefcaseBusiness },
  { title: "提案", text: "活动方案、PPT 生成、素材清单", icon: Layers3 },
  { title: "视觉", text: "图片生成、海报方向、比例规格", icon: WandSparkles }
];
