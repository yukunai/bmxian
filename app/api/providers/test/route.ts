import { NextResponse } from "next/server";
import { z } from "zod";
import { testGatewayProvider } from "@/lib/model-gateway";
import { getWorkspaceForRuntime } from "@/lib/server/store";
import { providerConfigSchema } from "@/lib/server/schemas";

const providerTestRequestSchema = z.object({
  providerId: z.string().optional(),
  provider: providerConfigSchema.optional()
});

export async function POST(request: Request) {
  try {
    const parsed = providerTestRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const workspace = await getWorkspaceForRuntime();
    const requestedId = parsed.data.provider?.id ?? parsed.data.providerId;
    const storedProvider = workspace.providerConfigs.find((provider) => provider.id === requestedId);
    const provider = parsed.data.provider ?? storedProvider;

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const runtimeProvider = {
      ...provider,
      apiKey: provider.apiKey.includes("••••") || !provider.apiKey
        ? storedProvider?.apiKey ?? provider.apiKey
        : provider.apiKey
    };

    const result = await testGatewayProvider(runtimeProvider);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
