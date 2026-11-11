import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema, productProfileSchema } from "@/lib/server/schemas";
import { deleteProduct, getWorkspaceForClient, upsertProduct } from "@/lib/server/store";

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ products: workspace.products });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = productProfileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertProduct(parsed.data);
  return NextResponse.json({ products: workspace.products }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = productProfileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertProduct(parsed.data);
  return NextResponse.json({ products: workspace.products });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteProduct(parsed.data.id);
  return NextResponse.json({ products: workspace.products });
}
