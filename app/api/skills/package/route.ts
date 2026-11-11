import { NextResponse } from "next/server";
import { z } from "zod";
import { routeSkillSchema } from "@/lib/server/schemas";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { getWorkspaceForClient, upsertSkill } from "@/lib/server/store";

const skillPackageSchema = z.object({
  kind: z.literal("bmxian.skill.package").default("bmxian.skill.package"),
  version: z.string().default("1.0.0"),
  exportedAt: z.string().optional(),
  skill: routeSkillSchema.optional(),
  skills: z.array(routeSkillSchema).optional()
}).refine((data) => data.skill || data.skills?.length, {
  message: "skill or skills is required",
  path: ["skill"]
});

function skillFileName(skillId: string) {
  return `bmxian-skill-${skillId.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const skillId = url.searchParams.get("skillId")?.trim();
  if (!skillId) return NextResponse.json({ error: "skillId is required" }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const skill = workspace.skills.find((item) => item.id === skillId);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  return NextResponse.json({
    kind: "bmxian.skill.package",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    skill
  }, {
    headers: {
      "Content-Disposition": `attachment; filename="${skillFileName(skill.id)}"`
    }
  });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = skillPackageSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const incomingSkills = parsed.data.skills ?? (parsed.data.skill ? [parsed.data.skill] : []);
  let workspace = await getWorkspaceForClient();

  for (const skill of incomingSkills) {
    workspace = await upsertSkill({
      ...skill,
      source: "uploaded"
    });
  }

  return NextResponse.json({
    imported: incomingSkills.length,
    importedSkillIds: incomingSkills.map((skill) => skill.id),
    skills: workspace.skills
  }, { status: 201 });
}
