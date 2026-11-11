import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { getWorkspaceForClient, saveProviders } from "@/lib/server/store";
import { providerUpdateSchema } from "@/lib/server/schemas";

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ providers: workspace.providerConfigs });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = providerUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await saveProviders(parsed.data.providers);
  return NextResponse.json({ providers: workspace.providerConfigs });
}
