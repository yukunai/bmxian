import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { characterProfileSchema, deleteByIdSchema } from "@/lib/server/schemas";
import { deleteCharacterProfile, getWorkspaceForClient, upsertCharacterProfile } from "@/lib/server/store";

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({
    selectedCharacterId: workspace.selectedCharacterId,
    characterProfiles: workspace.characterProfiles
  });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = characterProfileSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertCharacterProfile(parsed.data);
  return NextResponse.json({
    characterProfile: parsed.data,
    selectedCharacterId: workspace.selectedCharacterId,
    characterProfiles: workspace.characterProfiles
  }, { status: 201 });
}

export async function PUT(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = characterProfileSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await upsertCharacterProfile(parsed.data);
  return NextResponse.json({
    characterProfile: parsed.data,
    selectedCharacterId: workspace.selectedCharacterId,
    characterProfiles: workspace.characterProfiles
  });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteCharacterProfile(parsed.data.id);
  return NextResponse.json({
    selectedCharacterId: workspace.selectedCharacterId,
    characterProfiles: workspace.characterProfiles
  });
}
