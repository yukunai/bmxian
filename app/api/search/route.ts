import { NextResponse } from "next/server";
import { getWorkspaceForClient } from "@/lib/server/store";

type SearchResult = {
  id: string;
  kind: "商品" | "素材" | "LoRA" | "路线" | "作品" | "任务" | "排期";
  title: string;
  subtitle: string;
  nav: "products" | "materials" | "skills" | "assets" | "calendar" | "tasks";
  targetId: string;
};

function includesQuery(query: string, values: Array<string | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const workspace = await getWorkspaceForClient();

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = [
    ...workspace.products
      .filter((product) =>
        includesQuery(query, [
          product.name,
          product.category,
          product.audience,
          product.platform,
          ...product.notes
        ])
      )
      .map((product): SearchResult => ({
        id: `product-${product.id}`,
        kind: "商品",
        title: product.name,
        subtitle: `${product.category} / ${product.platform}`,
        nav: "products",
        targetId: product.id
      })),
    ...workspace.materials
      .filter((material) => includesQuery(query, [material.name, material.kind, material.mimeType, ...material.tags]))
      .map((material): SearchResult => ({
        id: `material-${material.id}`,
        kind: "素材",
        title: material.name,
        subtitle: `${material.kind} / ${material.tags.join("、") || material.mimeType}`,
        nav: "materials",
        targetId: material.id
      })),
    ...workspace.loraAssets
      .filter((asset) => includesQuery(query, [asset.name, asset.kind, asset.baseModel, asset.fileName, ...asset.triggerWords]))
      .map((asset): SearchResult => ({
        id: `lora-${asset.id}`,
        kind: "LoRA",
        title: asset.name,
        subtitle: `${asset.kind} / ${asset.baseModel}`,
        nav: "materials",
        targetId: asset.id
      })),
    ...workspace.skills
      .filter((skill) => includesQuery(query, [skill.name, skill.category, skill.description, skill.recommendedModel, ...skill.fields]))
      .map((skill): SearchResult => ({
        id: `skill-${skill.id}`,
        kind: "路线",
        title: skill.name,
        subtitle: `${skill.category} / ${skill.recommendedModel}`,
        nav: "skills",
        targetId: skill.id
      })),
    ...workspace.artifacts
      .filter((artifact) => includesQuery(query, [artifact.title, artifact.source, artifact.body, artifact.type]))
      .map((artifact): SearchResult => ({
        id: `artifact-${artifact.id}`,
        kind: "作品",
        title: artifact.title,
        subtitle: `${artifact.type} / ${artifact.status}`,
        nav: "assets",
        targetId: artifact.id
      })),
    ...workspace.tasks
      .filter((task) => includesQuery(query, [task.title, task.type, task.model, task.productName, task.skillName, task.prompt]))
      .map((task): SearchResult => ({
        id: `task-${task.id}`,
        kind: "任务",
        title: task.title,
        subtitle: `${task.type} / ${task.status}`,
        nav: "tasks",
        targetId: task.id
      })),
    ...workspace.publishPlan
      .filter((item) => includesQuery(query, [item.title, item.channel, item.productName, item.note, item.status]))
      .map((item): SearchResult => ({
        id: `publish-${item.id}`,
        kind: "排期",
        title: item.title,
        subtitle: `${item.channel} / ${item.status}`,
        nav: "calendar",
        targetId: item.id
      }))
  ];

  return NextResponse.json({ results: results.slice(0, 20) });
}
