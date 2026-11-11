import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { z } from "zod";
import type { WorkspaceSnapshot } from "@/lib/server/store";

const generatedDir = join(/*turbopackIgnore: true*/ process.cwd(), "public", "generated");
const uploadsDir = join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
const maxBundledMediaBytes = 50 * 1024 * 1024;

const localMediaAssetSchema = z.object({
  url: z.string(),
  mimeType: z.string(),
  dataBase64: z.string(),
  bytes: z.number().optional()
});

export const generatedMediaBundleSchema = z.object({
  version: z.literal(1).default(1),
  assets: z.array(localMediaAssetSchema).default([])
}).optional();

export const uploadedMediaBundleSchema = z.object({
  version: z.literal(1).default(1),
  assets: z.array(localMediaAssetSchema).default([])
}).optional();

export type GeneratedMediaBundle = z.infer<NonNullable<typeof generatedMediaBundleSchema>>;
export type UploadedMediaBundle = z.infer<NonNullable<typeof uploadedMediaBundleSchema>>;

function safeLocalFileName(url: string, prefix: "/generated/" | "/uploads/") {
  if (!url.startsWith(prefix)) return undefined;
  const name = url.slice(prefix.length);
  if (!name || name.includes("..") || name.startsWith("/") || name.split("/").some((part) => !part)) return undefined;
  return name;
}

function mimeTypeForFileName(fileName: string) {
  const ext = extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf"
  };
  return map[ext] ?? "application/octet-stream";
}

function localGeneratedUrls(workspace: WorkspaceSnapshot) {
  const urls = new Set<string>();
  for (const artifact of workspace.artifacts) {
    if (artifact.mediaUrl?.startsWith("/generated/")) urls.add(artifact.mediaUrl);
  }
  for (const task of workspace.tasks) {
    if (task.resultAssetUrl?.startsWith("/generated/")) urls.add(task.resultAssetUrl);
    if (task.providerResultUrl?.startsWith("/generated/")) urls.add(task.providerResultUrl);
  }
  return Array.from(urls);
}

function localUploadUrls(workspace: WorkspaceSnapshot) {
  const urls = new Set<string>();
  for (const material of workspace.materials) {
    if (material.url.startsWith("/uploads/")) urls.add(material.url);
  }
  for (const asset of workspace.loraAssets) {
    if (asset.url.startsWith("/uploads/")) urls.add(asset.url);
  }
  return Array.from(urls);
}

function diskPathFor(prefix: "/generated/" | "/uploads/", fileName: string) {
  return prefix === "/generated/"
    ? join(generatedDir, fileName)
    : join(uploadsDir, fileName);
}

function directoryFor(prefix: "/generated/" | "/uploads/") {
  return prefix === "/generated/" ? generatedDir : uploadsDir;
}

async function buildLocalMediaBundle(urls: string[], prefix: "/generated/" | "/uploads/") {
  const assets = await Promise.all(urls.map(async (url) => {
    const fileName = safeLocalFileName(url, prefix);
    if (!fileName) return undefined;

    try {
      const buffer = await readFile(diskPathFor(prefix, fileName));
      return {
        url,
        mimeType: mimeTypeForFileName(fileName),
        dataBase64: buffer.toString("base64"),
        bytes: buffer.byteLength
      };
    } catch {
      return undefined;
    }
  }));

  return {
    version: 1 as const,
    assets: assets.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
  };
}

export async function buildGeneratedMediaBundle(workspace: WorkspaceSnapshot) {
  return buildLocalMediaBundle(localGeneratedUrls(workspace), "/generated/");
}

export async function buildUploadedMediaBundle(workspace: WorkspaceSnapshot) {
  return buildLocalMediaBundle(localUploadUrls(workspace), "/uploads/");
}

export async function restoreGeneratedMediaBundle(input: unknown) {
  const parsed = generatedMediaBundleSchema.safeParse(input);
  return restoreLocalMediaBundle(parsed.success ? parsed.data : undefined, "/generated/");
}

export async function restoreUploadedMediaBundle(input: unknown) {
  const parsed = uploadedMediaBundleSchema.safeParse(input);
  return restoreLocalMediaBundle(parsed.success ? parsed.data : undefined, "/uploads/");
}

async function restoreLocalMediaBundle(
  bundle: GeneratedMediaBundle | UploadedMediaBundle | undefined,
  prefix: "/generated/" | "/uploads/"
) {
  if (!bundle) return { restored: 0 };

  await mkdir(directoryFor(prefix), { recursive: true });
  let restored = 0;

  for (const asset of bundle.assets) {
    const fileName = safeLocalFileName(asset.url, prefix);
    if (!fileName) continue;

    const buffer = Buffer.from(asset.dataBase64, "base64");
    if (buffer.byteLength > maxBundledMediaBytes) continue;

    await mkdir(join(directoryFor(prefix), fileName.split("/").slice(0, -1).join("/")), { recursive: true });
    await writeFile(diskPathFor(prefix, fileName), buffer);
    restored += 1;
  }

  return { restored };
}
