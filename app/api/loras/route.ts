import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { NextResponse } from "next/server";
import type { LoraAsset } from "@/lib/workbench-data";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteByIdSchema } from "@/lib/server/schemas";
import { deleteLoraAsset, getWorkspaceForClient, upsertLoraAsset } from "@/lib/server/store";

export const runtime = "nodejs";

const uploadDir = join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "loras");
const maxUploadBytes = 512 * 1024 * 1024;
const allowedExtensions = new Set([".safetensors", ".ckpt", ".pt", ".bin"]);

function safeFileName(name: string) {
  const ext = extname(name).toLowerCase();
  const stem = name
    .slice(0, ext ? -ext.length : undefined)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${stem || "lora"}${ext || ".safetensors"}`;
}

function parseString(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
}

function parseWeight(value: FormDataEntryValue | null) {
  const parsed = Number(parseString(value, "0.72"));
  if (!Number.isFinite(parsed)) return 0.72;
  return Math.min(Math.max(parsed, 0), 1.5);
}

function parseKind(value: FormDataEntryValue | null): LoraAsset["kind"] {
  const kind = parseString(value, "角色");
  return kind === "风格" || kind === "商品" || kind === "通用" ? kind : "角色";
}

export async function GET() {
  const workspace = await getWorkspaceForClient();
  return NextResponse.json({ loraAssets: workspace.loraAssets });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const form = await request.formData();
  const value = form.get("file");

  if (!(value instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const ext = extname(value.name).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    return NextResponse.json({ error: "LoRA file must be .safetensors, .ckpt, .pt, or .bin" }, { status: 400 });
  }

  if (value.size > maxUploadBytes) {
    return NextResponse.json({ error: "LoRA file is too large" }, { status: 413 });
  }

  await mkdir(uploadDir, { recursive: true });
  const id = `lora-${randomUUID().slice(0, 8)}`;
  const storedName = `${id}-${safeFileName(value.name)}`;
  const diskPath = join(uploadDir, storedName);
  const buffer = Buffer.from(await value.arrayBuffer());
  await writeFile(diskPath, buffer);

  const asset: LoraAsset = {
    id,
    name: parseString(form.get("name"), value.name.replace(ext, "")),
    kind: parseKind(form.get("kind")),
    baseModel: parseString(form.get("baseModel"), "SDXL / FLUX compatible"),
    fileName: value.name,
    mimeType: value.type || "application/octet-stream",
    size: value.size,
    url: `/uploads/loras/${storedName}`,
    previewUrl: parseString(form.get("previewUrl")) || undefined,
    triggerWords: parseTags(form.get("triggerWords")),
    defaultWeight: parseWeight(form.get("defaultWeight")),
    status: "可用",
    createdAt: new Date().toISOString()
  };

  const workspace = await upsertLoraAsset(asset);
  return NextResponse.json({ loraAsset: asset, loraAssets: workspace.loraAssets }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("editor");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const asset = workspace.loraAssets.find((item) => item.id === parsed.data.id);

  if (asset?.url.startsWith("/uploads/loras/")) {
    const diskPath = join(uploadDir, basename(asset.url));
    await unlink(diskPath).catch(() => undefined);
  }

  const updated = await deleteLoraAsset(parsed.data.id);
  return NextResponse.json({ loraAssets: updated.loraAssets });
}
