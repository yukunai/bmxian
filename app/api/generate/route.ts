import { NextResponse } from "next/server";
import { generateWithGateway, providerHasRuntimeKey } from "@/lib/model-gateway";
import type { GenerateRequest } from "@/lib/gateway-types";
import { providerConfigForModel } from "@/lib/gateway-types";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { addArtifact, getWorkspaceForRuntime } from "@/lib/server/store";
import { materialAssetSchema, modelEngineSchema, productProfileSchema, routeSkillSchema, visualGenerationSettingsSchema, workspaceModeSchema } from "@/lib/server/schemas";
import { z } from "zod";

const generateRequestSchema = z.object({
  prompt: z.string().min(1),
  mode: workspaceModeSchema,
  product: productProfileSchema,
  skill: routeSkillSchema,
  model: modelEngineSchema,
  visualSettings: visualGenerationSettingsSchema.optional(),
  history: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    text: z.string(),
    meta: z.string().optional()
  })).optional(),
  materials: z.array(materialAssetSchema).optional()
});

export async function POST(request: Request) {
  try {
    const guard = await requireWorkspaceRole("editor");
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const workspace = await getWorkspaceForRuntime();
    const provider = providerConfigForModel(parsed.data.model.id, workspace.providerConfigs, {
      routingPolicy: workspace.routingPolicy,
      hasCredential: providerHasRuntimeKey
    });
    const generateRequest: GenerateRequest = {
      ...parsed.data,
      provider
    };

    const response = await generateWithGateway(generateRequest);
    await addArtifact(response.artifact, response.task, response.assistantMessage);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
