import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { NextResponse } from "next/server";
import type { MaterialAsset } from "@/lib/workbench-data";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema } from "@/lib/server/schemas";
import { deleteMaterial, getWorkspaceForClient, upsertMaterial } from "@/lib/server/store";

export const runtime = "nodejs";

const uploadDir = join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
const maxUploadBytes = 25 * 1024 * 1024;

function kindForMime(mimeType: string): MaterialAsset["kind"] {
  if (mimeType.startsWith("image/")) return "图片";
  if (mimeType.startsWith("video/")) return "视频";
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("presentation")
  ) {
    return "文档";
  }

  return "其他";
}

function safeFileName(name: string) {
  const ext = extname(name).toLowerCase();
  const stem = name
    .slice(0, ext ? -ext.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${stem || "material"}${ext || ""}`;
}

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
}

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ materials: workspace.materials });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const form = await request.formData();
  const value = form.get("file");

  if (!(value instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (value.size > maxUploadBytes) {
    return NextResponse.json({ error: "file is too large" }, { status: 413 });
  }

  await mkdir(uploadDir, { recursive: true });
  const id = `mat-${randomUUID().slice(0, 8)}`;
  const storedName = `${id}-${safeFileName(value.name)}`;
  const diskPath = join(uploadDir, storedName);
  const buffer = Buffer.from(await value.arrayBuffer());
  await writeFile(diskPath, buffer);

  const material: MaterialAsset = {
    id,
    name: value.name,
    kind: kindForMime(value.type || "application/octet-stream"),
    mimeType: value.type || "application/octet-stream",
    size: value.size,
    url: `/uploads/${storedName}`,
    tags: parseTags(form.get("tags")),
    createdAt: new Date().toISOString()
  };

  const workspace = await upsertMaterial(material);
  return NextResponse.json({ material, materials: workspace.materials }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const material = workspace.materials.find((item) => item.id === parsed.data.id);

  if (material?.url.startsWith("/uploads/")) {
    const diskPath = join(uploadDir, basename(material.url));
    await unlink(diskPath).catch(() => undefined);
  }

  const updated = await deleteMaterial(parsed.data.id);
  return NextResponse.json({ materials: updated.materials });
}
