import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteByIdSchema, keyVaultSecretScopeSchema } from "@/lib/server/schemas";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteKeyVaultSecret, getWorkspaceForClient, upsertKeyVaultSecret } from "@/lib/server/store";

const keyVaultUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  scope: keyVaultSecretScopeSchema,
  linkedId: z.string().trim().min(1).max(120).optional(),
  secretValue: z.string().optional()
});

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ secrets: workspace.keyVault });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = keyVaultUpsertSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!parsed.data.secretValue?.trim()) {
    return NextResponse.json({ error: "secretValue is required when creating a key vault secret" }, { status: 400 });
  }

  const workspace = await upsertKeyVaultSecret({
    ...parsed.data,
    secretValue: parsed.data.secretValue,
    createdBy: guard.session.email
  });

  return NextResponse.json({ secrets: workspace.keyVault }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = keyVaultUpsertSchema.extend({ id: z.string().min(1) }).safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await getWorkspaceForClient();
  if (!current.keyVault.some((secret) => secret.id === parsed.data.id)) {
    return NextResponse.json({ error: "Secret not found" }, { status: 404 });
  }

  const workspace = await upsertKeyVaultSecret({
    ...parsed.data,
    secretValue: parsed.data.secretValue,
    createdBy: guard.session.email
  });

  return NextResponse.json({ secrets: workspace.keyVault });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteKeyVaultSecret(parsed.data.id);
  return NextResponse.json({ secrets: workspace.keyVault });
}
