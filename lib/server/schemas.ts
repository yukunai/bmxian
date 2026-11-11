import { z } from "zod";

export const workspaceModeSchema = z.enum(["聊天", "文章", "电商", "图片", "视频", "海报", "PPT"]);
export const visualAspectRatioSchema = z.enum(["16:9", "9:16", "3:4", "1:1", "21:9"]);

export const productProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.string(),
  audience: z.string(),
  stage: z.string(),
  platform: z.string(),
  tone: z.string(),
  assets: z.number(),
  notes: z.array(z.string())
});

export const materialAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["图片", "视频", "文档", "其他"]),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string()
});

export const loraAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["角色", "风格", "商品", "通用"]),
  baseModel: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
  previewUrl: z.string().optional(),
  triggerWords: z.array(z.string()),
  defaultWeight: z.number(),
  status: z.enum(["可用", "待训练", "停用"]),
  createdAt: z.string()
});

export const characterMemoryEntrySchema = z.object({
  id: z.string(),
  scene: z.string(),
  prompt: z.string(),
  pose: z.string(),
  successScore: z.number(),
  imageUrl: z.string().optional(),
  createdAt: z.string()
});

export const characterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.enum(["Realistic", "Anime", "Commercial", "Brand IP"]),
  status: z.enum(["可用", "训练中", "需补图"]),
  thumbnailUrl: z.string().optional(),
  identity: z.object({
    encoder: z.enum(["InsightFace", "ArcFace", "ViT"]),
    vectorId: z.string(),
    dimensions: z.number(),
    faceReferenceUrls: z.array(z.string()),
    strength: z.number(),
    consistencyScore: z.number(),
    structure: z.object({
      eyeDistance: z.string(),
      jawShape: z.string(),
      noseBridge: z.string(),
      ageRange: z.string()
    })
  }),
  style: z.object({
    presetId: z.string(),
    styleName: z.string(),
    styleVectorId: z.string(),
    strength: z.number(),
    loraAssetId: z.string().optional(),
    triggerWords: z.array(z.string())
  }),
  memory: z.array(characterMemoryEntrySchema),
  fusion: z.object({
    identity: z.number(),
    style: z.number(),
    prompt: z.number(),
    state: z.number()
  }),
  version: z.string(),
  lastUsedAt: z.string(),
  createdAt: z.string()
});

export const routeSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  fields: z.array(z.string()),
  recommendedModel: z.string(),
  score: z.string(),
  source: z.enum(["built-in", "custom", "market", "uploaded"]).optional()
});

export const marketplaceSkillSchema = routeSkillSchema.extend({
  author: z.string(),
  installs: z.string(),
  price: z.enum(["免费", "付费"]),
  tags: z.array(z.string()),
  status: z.enum(["已上架", "待审核", "已下架"]).optional(),
  version: z.string().optional(),
  publisherSkillId: z.string().optional(),
  publishedAt: z.string().optional(),
  reviewNote: z.string().optional()
});

export const modelEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  lane: z.string(),
  latency: z.string(),
  cost: z.string(),
  status: z.enum(["已接入", "待配置", "预留"]),
  strengths: z.array(z.string())
});

export const visualGenerationSettingsSchema = z.object({
  aspectRatio: visualAspectRatioSchema,
  styleId: z.string(),
  styleName: z.string(),
  stylePrompt: z.string(),
  lockStyle: z.boolean(),
  characterProfileId: z.string().optional(),
  characterVersion: z.string().optional(),
  characterLock: z.boolean().default(true),
  characterName: z.string().optional(),
  characterReferenceUrl: z.string().optional(),
  referenceFaceUrls: z.array(z.string()).optional(),
  identityEncoder: z.string().optional(),
  identityVectorId: z.string().optional(),
  identityDimensions: z.number().optional(),
  identityConsistencyScore: z.number().optional(),
  identityStrength: z.number().optional(),
  characterStrength: z.number().optional(),
  seed: z.string().optional(),
  negativePrompt: z.string().optional(),
  statePreset: z.string().optional(),
  styleStrength: z.number().optional(),
  promptStrength: z.number().optional(),
  stateStrength: z.number().optional(),
  generationCount: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]).optional(),
  memorySceneIds: z.array(z.string()).optional(),
  characterLoraAssetId: z.string().optional(),
  characterLoraName: z.string().optional(),
  characterLoraId: z.string().optional(),
  characterLoraUrl: z.string().optional(),
  characterLoraBaseModel: z.string().optional(),
  characterLoraTriggerWords: z.array(z.string()).optional(),
  characterLoraWeight: z.number().optional(),
  styleLoraId: z.string().optional(),
  loraWeight: z.number().optional(),
  triggerWords: z.array(z.string()).optional(),
  baseModel: z.string().optional(),
  referenceImage: z.string().optional(),
  styleVersion: z.string().optional()
});

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  meta: z.string().optional()
});

export const artifactSchema = z.object({
  id: z.string(),
  type: z.union([workspaceModeSchema, z.enum(["海报", "商品"])]),
  title: z.string(),
  source: z.string(),
  body: z.string(),
  status: z.enum(["草稿", "已保存", "待复核"]),
  mediaUrl: z.string().optional()
});

export const generationTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.union([workspaceModeSchema, z.enum(["合规"])]),
  modelId: z.string().optional(),
  model: z.string(),
  cost: z.string(),
  status: z.enum(["排队中", "生成中", "已完成", "失败"]),
  progress: z.number().optional(),
  artifactId: z.string().optional(),
  prompt: z.string().optional(),
  productName: z.string().optional(),
  skillName: z.string().optional(),
  visualSettings: visualGenerationSettingsSchema.optional(),
  providerId: z.string().optional(),
  providerLabel: z.string().optional(),
  providerStatus: z.enum(["demo", "submitted", "processing", "completed", "failed", "fallback"]).optional(),
  externalJobId: z.string().optional(),
  providerWarning: z.string().optional(),
  providerResultUrl: z.string().optional(),
  resultAssetUrl: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const usageEventSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  mode: z.union([workspaceModeSchema, z.enum(["合规"])]),
  model: z.string(),
  providerId: z.string().optional(),
  providerLabel: z.string().optional(),
  amountCents: z.number(),
  currency: z.enum(["CNY"]),
  status: z.enum(["estimated", "final", "refunded"]),
  createdAt: z.string()
});

export const supplierInvoiceSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  providerLabel: z.string(),
  period: z.string(),
  amountCents: z.number(),
  currency: z.enum(["CNY"]),
  externalInvoiceId: z.string().optional(),
  source: z.enum(["manual", "csv", "json"]),
  lineCount: z.number(),
  notes: z.array(z.string()),
  importedAt: z.string()
});

export const paymentSessionSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  period: z.string(),
  amountCents: z.number(),
  currency: z.enum(["CNY"]),
  provider: z.string(),
  status: z.enum(["pending", "paid", "cancelled"]),
  checkoutUrl: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  paidAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  note: z.string().optional()
});

export const keyVaultSecretScopeSchema = z.enum(["provider", "webhook", "payment", "integration", "custom"]);

export const keyVaultSecretSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: keyVaultSecretScopeSchema,
  linkedId: z.string().optional(),
  maskedValue: z.string().default(""),
  secretCiphertext: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  lastUsedAt: z.string().optional()
});

export const teamMemberRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: teamMemberRoleSchema,
  status: z.enum(["active", "invited", "disabled"]),
  createdAt: z.string()
});

export const publishPlanItemSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  title: z.string(),
  channel: z.enum(["小红书", "抖音", "淘宝", "视频号", "私域"]),
  productName: z.string(),
  publishAt: z.string(),
  status: z.enum(["待发布", "已发布", "暂缓"]),
  note: z.string(),
  createdAt: z.string()
});

export const providerConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  baseUrl: z.string(),
  model: z.string(),
  apiKey: z.string(),
  enabled: z.boolean(),
  kind: z.enum(["chat", "media"]).optional(),
  capabilities: z.array(z.enum(["text", "image", "video", "poster", "deck"])).optional()
});

export const providerRoutingPolicySchema = z.object({
  textStrategy: z.enum(["balanced", "domestic-first", "international-first", "lowest-cost", "quality-first"]),
  updatedAt: z.string().optional()
});

export const workspaceSnapshotSchema = z.object({
  workspaceId: z.string(),
  workspaceName: z.string(),
  ownerEmail: z.string(),
  activeMode: workspaceModeSchema,
  selectedProductId: z.string(),
  selectedSkillId: z.string(),
  selectedToolSkillId: z.string().default(""),
  selectedModelId: z.string(),
  visualSettings: visualGenerationSettingsSchema.default({
    aspectRatio: "3:4",
    styleId: "clean-commerce",
    styleName: "清透商品主图",
    stylePrompt: "统一使用浅色干净电商棚拍风格，自然柔光，产品主体清晰，背景低干扰，少量精致卖点标签，画面干净可信。",
    lockStyle: true,
    characterProfileId: "char-default",
    characterVersion: "v1",
    characterLock: true,
    characterName: "默认角色",
    characterReferenceUrl: "style://character/default-face-01",
    referenceFaceUrls: ["style://character/default-face-01", "style://character/default-face-02", "style://character/default-face-03"],
    identityEncoder: "InsightFace",
    identityVectorId: "identity-default-1024-v1",
    identityDimensions: 1024,
    identityConsistencyScore: 92,
    identityStrength: 0.85,
    characterStrength: 0.85,
    seed: "",
    negativePrompt: "模糊，低质量，畸形，过曝，变形，噪点，换脸，脸部不一致",
    statePreset: "calm",
    styleStrength: 0.62,
    promptStrength: 1,
    stateStrength: 0.42,
    generationCount: 4,
    memorySceneIds: ["mem-default-portrait", "mem-default-park"],
    characterLoraAssetId: "lora-character-default",
    characterLoraName: "角色一致性 LoRA",
    characterLoraId: "default-character-v1.safetensors",
    characterLoraUrl: "lora://local/character/default-character-v1.safetensors",
    characterLoraBaseModel: "SDXL / FLUX compatible",
    characterLoraTriggerWords: ["consistent_character", "same female character"],
    characterLoraWeight: 0.72,
    styleLoraId: "reserved-clean-commerce-v1",
    loraWeight: 0.68,
    triggerWords: ["bmxian_clean_commerce", "clean product lighting"],
    baseModel: "image-base-commerce",
    referenceImage: "style://clean-commerce/reference-v1",
    styleVersion: "v1"
  }),
  messages: z.array(messageSchema),
  artifacts: z.array(artifactSchema),
  tasks: z.array(generationTaskSchema),
  products: z.array(productProfileSchema),
  materials: z.array(materialAssetSchema),
  loraAssets: z.array(loraAssetSchema).default([]),
  characterProfiles: z.array(characterProfileSchema).default([]),
  selectedCharacterId: z.string().default("char-default"),
  publishPlan: z.array(publishPlanItemSchema).default([]),
  skills: z.array(routeSkillSchema),
  publishedSkills: z.array(marketplaceSkillSchema).default([]),
  usageEvents: z.array(usageEventSchema).default([]),
  supplierInvoices: z.array(supplierInvoiceSchema).default([]),
  paymentSessions: z.array(paymentSessionSchema).default([]),
  keyVault: z.array(keyVaultSecretSchema).default([]),
  teamMembers: z.array(teamMemberSchema).default([]),
  providerConfigs: z.array(providerConfigSchema),
  routingPolicy: providerRoutingPolicySchema.default({
    textStrategy: "balanced"
  })
});

export const partialWorkspaceSnapshotSchema = workspaceSnapshotSchema.partial();

export const providerUpdateSchema = z.object({
  providers: z.array(providerConfigSchema)
});

export const deleteByIdSchema = z.object({
  id: z.string()
});
