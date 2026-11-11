import { NextResponse } from "next/server";
import { z } from "zod";
import { buildMediaProviderRequest, type MediaMode } from "@/lib/media-provider";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { materialAssetSchema, modelEngineSchema, productProfileSchema, providerConfigSchema, routeSkillSchema, visualGenerationSettingsSchema } from "@/lib/server/schemas";

const mediaModes = ["图片", "视频", "海报", "PPT"] as const;

const mappingPreviewSchema = z.object({
  provider: providerConfigSchema,
  taskId: z.string().default("preview-task"),
  prompt: z.string().min(1),
  mode: z.enum(mediaModes),
  product: productProfileSchema,
  skill: routeSkillSchema,
  model: modelEngineSchema,
  visualSettings: visualGenerationSettingsSchema.optional(),
  materials: z.array(materialAssetSchema).optional()
});

function redactHeaders(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [
    key,
    key.toLowerCase() === "authorization" ? (value ? "Bearer ••••" : "") : value
  ]));
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = mappingPreviewSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const preview = buildMediaProviderRequest(parsed.data.provider, {
    taskId: parsed.data.taskId,
    prompt: parsed.data.prompt,
    mode: parsed.data.mode as MediaMode,
    product: parsed.data.product,
    skill: parsed.data.skill,
    model: parsed.data.model,
    visualSettings: parsed.data.visualSettings,
    materials: parsed.data.materials
  });

  return NextResponse.json({
    mapping: {
      ...preview,
      headers: redactHeaders(preview.headers)
    }
  });
}
