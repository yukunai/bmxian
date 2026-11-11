import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema, publishPlanItemSchema } from "@/lib/server/schemas";
import {
  deletePublishPlanItem,
  getWorkspaceForClient,
  upsertPublishPlanItem,
  upsertPublishPlanItems
} from "@/lib/server/store";
import type { Artifact, PublishPlanItem } from "@/lib/workbench-data";

const scheduleArtifactsSchema = z.object({
  artifactIds: z.array(z.string()).min(1).max(12),
  startDate: z.string().optional()
});

const calendarPostSchema = z.union([
  scheduleArtifactsSchema,
  publishPlanItemSchema
]);

type ScheduleArtifactsPayload = z.infer<typeof scheduleArtifactsSchema>;

function isScheduleArtifactsPayload(value: z.infer<typeof calendarPostSchema>): value is ScheduleArtifactsPayload {
  return "artifactIds" in value;
}

function createId() {
  return `publish-${randomUUID().slice(0, 8)}`;
}

function inferChannel(artifact: Artifact): PublishPlanItem["channel"] {
  const text = `${artifact.title} ${artifact.source} ${artifact.body}`;
  if (text.includes("抖音")) return "抖音";
  if (text.includes("淘宝") || text.includes("详情")) return "淘宝";
  if (text.includes("视频号")) return "视频号";
  if (text.includes("私域")) return "私域";
  return "小红书";
}

function inferProductName(artifact: Artifact) {
  const [sourceName] = artifact.source.split("/");
  return sourceName.trim() || artifact.title.replace(/^(小红书种草|抖音口播|淘宝详情页|私域话术)：/, "");
}

function publishDate(startDate: string | undefined, index: number) {
  const base = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(base.getTime())) {
    base.setTime(Date.now());
  }

  base.setDate(base.getDate() + index + 1);
  base.setHours(index % 2 === 0 ? 10 : 19, 30, 0, 0);
  return base.toISOString();
}

function planFromArtifact(artifact: Artifact, index: number, startDate?: string): PublishPlanItem {
  const channel = inferChannel(artifact);
  return {
    id: createId(),
    artifactId: artifact.id,
    title: artifact.title,
    channel,
    productName: inferProductName(artifact),
    publishAt: publishDate(startDate, index),
    status: "待发布",
    note: `${channel}发布前复核标题、封面、禁用词和平台规格。`,
    createdAt: new Date().toISOString()
  };
}

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ publishPlan: workspace.publishPlan });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = calendarPostSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (isScheduleArtifactsPayload(parsed.data)) {
    const payload = parsed.data;
    const workspace = await getWorkspaceForClient();
    const artifacts = payload.artifactIds
      .map((id) => workspace.artifacts.find((artifact) => artifact.id === id))
      .filter((artifact): artifact is Artifact => Boolean(artifact));

    if (artifacts.length === 0) {
      return NextResponse.json({ error: "No artifacts found for scheduling" }, { status: 404 });
    }

    const items = artifacts.map((artifact, index) => planFromArtifact(artifact, index, payload.startDate));
    const updated = await upsertPublishPlanItems(items);
    return NextResponse.json({ items, publishPlan: updated.publishPlan }, { status: 201 });
  }

  const workspace = await upsertPublishPlanItem(parsed.data);
  return NextResponse.json({ item: parsed.data, publishPlan: workspace.publishPlan }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = publishPlanItemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertPublishPlanItem(parsed.data);
  return NextResponse.json({ item: parsed.data, publishPlan: workspace.publishPlan });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deletePublishPlanItem(parsed.data.id);
  return NextResponse.json({ publishPlan: workspace.publishPlan });
}
