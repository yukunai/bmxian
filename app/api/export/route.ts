import { NextResponse } from "next/server";
import type { Artifact } from "@/lib/workbench-data";
import { getWorkspaceForClient } from "@/lib/server/store";

function artifactToMarkdown(artifact: Artifact) {
  return [
    `## ${artifact.title}`,
    "",
    `- 类型：${artifact.type}`,
    `- 来源：${artifact.source}`,
    `- 状态：${artifact.status}`,
    "",
    artifact.body,
    ""
  ].join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "md";
  const workspace = await getWorkspaceForClient();
  const exportedAt = new Date().toISOString();

  if (format === "json") {
    return NextResponse.json(
      {
        exportedAt,
        artifacts: workspace.artifacts
      },
      {
        headers: {
          "Content-Disposition": "attachment; filename=\"bmxian-artifacts.json\""
        }
      }
    );
  }

  const markdown = [
    "# 斑马线作品集导出",
    "",
    `导出时间：${exportedAt}`,
    `作品数量：${workspace.artifacts.length}`,
    "",
    ...workspace.artifacts.map(artifactToMarkdown)
  ].join("\n");

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"bmxian-artifacts.md\""
    }
  });
}
