import { NextResponse } from "next/server";
import { z } from "zod";
import { marketplaceSkills } from "@/lib/workbench-data";
import type { MarketplaceSkill } from "@/lib/workbench-data";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { getWorkspaceForClient, saveWorkspaceSnapshot } from "@/lib/server/store";

const publishSkillSchema = z.object({
  skillId: z.string(),
  version: z.string().trim().min(1).default("1.0.0"),
  tags: z.array(z.string()).optional(),
  reviewNote: z.string().optional()
});

const updateMarketSkillSchema = z.object({
  id: z.string(),
  status: z.enum(["已上架", "待审核", "已下架"]),
  reviewNote: z.string().optional()
});

const deleteMarketSkillSchema = z.object({
  id: z.string()
});

function builtInMarketSkill(skill: MarketplaceSkill): MarketplaceSkill {
  return {
    ...skill,
    status: skill.status ?? "已上架",
    version: skill.version ?? "1.0.0",
    publisherSkillId: skill.publisherSkillId ?? skill.id
  };
}

function uniqueCategories(skills: MarketplaceSkill[]) {
  return ["全部", ...Array.from(new Set(skills.map((skill) => skill.category)))];
}

function publishedSkillId(skillId: string) {
  return `local-${skillId.replace(/^market-/, "")}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const workspace = await getWorkspaceForClient();
  const allSkills = [
    ...marketplaceSkills.map(builtInMarketSkill),
    ...workspace.publishedSkills
  ];
  const skills = category && category !== "全部"
    ? allSkills.filter((skill) => skill.category === category)
    : allSkills;

  return NextResponse.json({
    categories: uniqueCategories(allSkills),
    skills
  });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = publishSkillSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const sourceSkill = workspace.skills.find((skill) => skill.id === parsed.data.skillId);
  if (!sourceSkill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const now = new Date().toISOString();
  const marketSkill: MarketplaceSkill = {
    ...sourceSkill,
    id: publishedSkillId(sourceSkill.id),
    source: "market",
    author: workspace.workspaceName || "我的工作区",
    installs: "0",
    price: "免费",
    tags: parsed.data.tags?.length ? parsed.data.tags : [sourceSkill.category, ...sourceSkill.fields.slice(0, 2)],
    status: "待审核",
    version: parsed.data.version,
    publisherSkillId: sourceSkill.id,
    publishedAt: now,
    reviewNote: parsed.data.reviewNote ?? "等待团队审核"
  };

  const publishedSkills = workspace.publishedSkills.some((skill) => skill.id === marketSkill.id)
    ? workspace.publishedSkills.map((skill) => (skill.id === marketSkill.id ? marketSkill : skill))
    : [marketSkill, ...workspace.publishedSkills];
  const nextWorkspace = await saveWorkspaceSnapshot({ publishedSkills });

  return NextResponse.json({ skill: marketSkill, publishedSkills: nextWorkspace.publishedSkills }, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = updateMarketSkillSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const target = workspace.publishedSkills.find((skill) => skill.id === parsed.data.id);
  if (!target) return NextResponse.json({ error: "Published skill not found" }, { status: 404 });

  const publishedSkills = workspace.publishedSkills.map((skill) =>
    skill.id === parsed.data.id
      ? {
          ...skill,
          status: parsed.data.status,
          reviewNote: parsed.data.reviewNote ?? (parsed.data.status === "已上架" ? "审核通过" : parsed.data.status === "已下架" ? "已从市场下架" : "等待团队审核")
        }
      : skill
  );
  const nextWorkspace = await saveWorkspaceSnapshot({ publishedSkills });

  return NextResponse.json({ publishedSkills: nextWorkspace.publishedSkills });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = deleteMarketSkillSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const publishedSkills = workspace.publishedSkills.filter((skill) => skill.id !== parsed.data.id);
  const nextWorkspace = await saveWorkspaceSnapshot({ publishedSkills });

  return NextResponse.json({ publishedSkills: nextWorkspace.publishedSkills });
}
