import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { productProfileSchema } from "@/lib/server/schemas";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { addCampaignPackage } from "@/lib/server/store";
import type { Artifact, GenerationTask, Message } from "@/lib/workbench-data";

const channelSchema = z.enum(["小红书", "抖音", "淘宝详情", "私域"]);
const defaultChannels: Array<z.infer<typeof channelSchema>> = ["小红书", "抖音", "淘宝详情", "私域"];

const campaignRequestSchema = z.object({
  product: productProfileSchema,
  channels: z.array(channelSchema).min(1).max(4).optional()
});

function createId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function productFacts(product: z.infer<typeof productProfileSchema>) {
  return [
    `商品：${product.name}`,
    `类目：${product.category}`,
    `价格：${product.price}`,
    `人群：${product.audience}`,
    `阶段：${product.stage}`,
    `平台：${product.platform}`,
    `语气：${product.tone}`,
    `卖点：${product.notes.join(" / ")}`
  ].join("\n");
}

function bodyForChannel(channel: z.infer<typeof channelSchema>, product: z.infer<typeof productProfileSchema>) {
  const notes = product.notes.slice(0, 4);
  const primary = notes[0] ?? "核心卖点";
  const secondary = notes[1] ?? "使用场景";
  const third = notes[2] ?? "购买理由";

  if (channel === "小红书") {
    return [
      productFacts(product),
      "",
      "标题备选：",
      `1. ${product.name}，我会这样写真实种草`,
      `2. ${primary}到底适不适合${product.audience}`,
      "",
      "正文：",
      `最近在整理${product.category}内容，我会把这款${product.name}放在“先讲场景，再讲证据”的结构里。`,
      `开头先说用户场景：${product.audience}最在意的不是参数堆叠，而是用起来是否省心。`,
      `中段把卖点拆开：${notes.map((note) => `「${note}」`).join("、")}。每个卖点都配一个生活化例子，避免空喊。`,
      `结尾给选择建议：如果你正在${product.stage}阶段做决策，可以优先看${primary}和${secondary}。`,
      "",
      "标签：",
      `#${product.category.replace(/[ /]+/g, "")} #${product.name.replace(/\s+/g, "")} #真实体验 #电商种草`
    ].join("\n");
  }

  if (channel === "抖音") {
    return [
      productFacts(product),
      "",
      "短视频口播脚本：",
      `0-3 秒：还在纠结${product.category}怎么选？先看这款${product.name}适不适合你。`,
      `3-8 秒：它主打${primary}，适合${product.audience}这个场景。`,
      `8-15 秒：第二个重点是${secondary}，镜头直接给细节，不说虚词。`,
      `15-23 秒：再补一个购买理由，${third}，把用户顾虑讲清楚。`,
      `23-30 秒：如果你在${product.stage}，可以先收藏这条，按这三个点去对比。`,
      "",
      "画面建议：开头真人使用场景，中段产品细节，结尾价格和平台信息。"
    ].join("\n");
  }

  if (channel === "淘宝详情") {
    return [
      productFacts(product),
      "",
      "详情页首屏：",
      `主标题：${product.name}`,
      `副标题：为${product.audience}准备的${primary}解决方案`,
      "",
      "模块结构：",
      `1. 用户痛点：为什么${product.audience}需要这类${product.category}。`,
      `2. 核心利益：${primary}，用 1 张大图和 1 行短文案讲清楚。`,
      `3. 证据拆解：${notes.map((note, index) => `${index + 1}) ${note}`).join("；")}。`,
      `4. 价格/阶段：${product.price}，适配${product.stage}。`,
      "5. 购买提醒：避免绝对化承诺，保留规格、适用人群和售后说明。"
    ].join("\n");
  }

  return [
    productFacts(product),
    "",
    "私域转化话术：",
    `第一条：今天给你看一款${product.name}，比较适合${product.audience}，我先发重点，不刷屏。`,
    `第二条：它主要看三点：${primary}、${secondary}、${third}。如果你关心使用体验，先看前两个。`,
    `第三条：价格区间是${product.price}，现在处在${product.stage}，适合先做对比或加购。`,
    `第四条：你要是想判断是否适合自己，可以把你的使用场景发我，我按${product.category}帮你筛。`,
    "",
    "客服提醒：不用夸大效果，重点追问场景、预算和顾虑。"
  ].join("\n");
}

function titleForChannel(channel: z.infer<typeof channelSchema>, productName: string) {
  if (channel === "小红书") return `小红书种草：${productName}`;
  if (channel === "抖音") return `抖音口播：${productName}`;
  if (channel === "淘宝详情") return `淘宝详情页：${productName}`;
  return `私域话术：${productName}`;
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = campaignRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { product } = parsed.data;
  const channels = parsed.data.channels ?? defaultChannels;
  const now = new Date().toISOString();
  const packageId = createId("campaign");

  const artifacts: Artifact[] = channels.map((channel) => ({
    id: `${packageId}-${channel}`,
    type: "电商",
    title: titleForChannel(channel, product.name),
    source: `${product.name} / 内容套餐 / ${channel}`,
    body: bodyForChannel(channel, product),
    status: "待复核"
  }));

  const tasks: GenerationTask[] = artifacts.map((artifact, index) => ({
    id: `${packageId}-task-${index + 1}`,
    title: `内容包：${artifact.title}`,
    type: "电商",
    model: "内容套餐 Demo",
    cost: "预估 0.08 元",
    status: "已完成",
    progress: 100,
    artifactId: artifact.id,
    prompt: `为 ${product.name} 生成 ${channels[index]} 内容`,
    productName: product.name,
    skillName: "电商内容套餐",
    createdAt: now,
    updatedAt: now
  }));

  const assistantMessage: Message = {
    id: `${packageId}-message`,
    role: "assistant",
    text: `已为「${product.name}」生成 ${artifacts.length} 条多平台内容资产，已进入作品集待复核。`,
    meta: "斑马线内容套餐"
  };

  const workspace = await addCampaignPackage(artifacts, tasks, assistantMessage);

  return NextResponse.json(
    {
      packageId,
      channels,
      artifacts,
      tasks,
      assistantMessage,
      workspaceArtifacts: workspace.artifacts.length
    },
    { status: 201 }
  );
}
