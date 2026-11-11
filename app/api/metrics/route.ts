import { NextResponse } from "next/server";
import { mergeUsageEvents, usageSummary } from "@/lib/billing";
import { getWorkspaceForClient } from "@/lib/server/store";

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function topCounts(counts: Record<string, number>, fallback: string) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (entries.length === 0) return fallback;
  return entries.map(([key, value]) => `${key} ${value}`).join(" / ");
}

export async function GET() {
  const workspace = await getWorkspaceForClient();
  const artifactTypes = countBy(workspace.artifacts, (artifact) => artifact.type);
  const skillCategories = countBy(workspace.skills, (skill) => skill.category);
  const taskStatuses = countBy(workspace.tasks, (task) => task.status);
  const materialKinds = countBy(workspace.materials, (material) => material.kind);
  const publishStatuses = countBy(workspace.publishPlan, (item) => item.status);
  const events = mergeUsageEvents(workspace.usageEvents, workspace.tasks);
  const billing = usageSummary(events);

  return NextResponse.json({
    metrics: [
      {
        label: "作品总数",
        value: String(workspace.artifacts.length),
        detail: topCounts(artifactTypes, "暂无作品")
      },
      {
        label: "已保存路线",
        value: String(workspace.skills.length),
        detail: topCounts(skillCategories, "暂无路线")
      },
      {
        label: "模型成本",
        value: billing.spentLabel,
        detail: `${billing.eventCount} 条计量 / ${topCounts(taskStatuses, "暂无任务")}`
      },
      {
        label: "素材资产",
        value: String(workspace.materials.length),
        detail: topCounts(materialKinds, "暂无素材")
      },
      {
        label: "发布排期",
        value: String(workspace.publishPlan.length),
        detail: topCounts(publishStatuses, "暂无排期")
      }
    ]
  });
}
