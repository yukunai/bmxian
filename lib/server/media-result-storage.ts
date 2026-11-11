import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type MediaResultStorage = {
  originalUrl: string;
  url?: string;
  mimeType?: string;
  bytes?: number;
  source: "data-url" | "remote" | "remote-skipped";
  warning?: string;
};

const generatedDir = join(/*turbopackIgnore: true*/ process.cwd(), "public", "generated");

function maxResultBytes() {
  const configured = Number(process.env.BMXIAN_MAX_MEDIA_RESULT_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : 50 * 1024 * 1024;
}

function safeStem(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "media-result";
}

function extensionForMime(mimeType: string) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "application/pdf": ".pdf"
  };
  return map[normalized] ?? ".bin";
}

async function writeStoredMedia(taskId: string, mimeType: string, buffer: Buffer, originalUrl: string, source: "data-url" | "remote") {
  if (buffer.byteLength > maxResultBytes()) {
    return {
      originalUrl,
      source,
      warning: `媒体结果超过本地存储限制：${buffer.byteLength} bytes。`
    } satisfies MediaResultStorage;
  }

  await mkdir(generatedDir, { recursive: true });
  const fileName = `${safeStem(taskId)}${extensionForMime(mimeType)}`;
  const diskPath = join(generatedDir, fileName);
  await writeFile(diskPath, buffer);

  return {
    originalUrl,
    url: `/generated/${fileName}`,
    mimeType,
    bytes: buffer.byteLength,
    source
  } satisfies MediaResultStorage;
}

async function persistDataUrl(taskId: string, resultUrl: string) {
  const match = /^data:([^;,]+)?((?:;[^,]*)?),(.*)$/s.exec(resultUrl);
  if (!match) return undefined;

  const mimeType = match[1] || "application/octet-stream";
  const metadata = match[2] || "";
  const payload = match[3] || "";
  const buffer = metadata.includes(";base64")
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload));

  return writeStoredMedia(taskId, mimeType, buffer, resultUrl, "data-url");
}

async function persistRemoteUrl(taskId: string, resultUrl: string) {
  if (process.env.BMXIAN_STORE_REMOTE_MEDIA !== "true") {
    return {
      originalUrl: resultUrl,
      source: "remote-skipped"
    } satisfies MediaResultStorage;
  }

  const response = await fetch(resultUrl, {
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    return {
      originalUrl: resultUrl,
      source: "remote",
      warning: `远程媒体抓取失败：${response.status}。`
    } satisfies MediaResultStorage;
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return writeStoredMedia(taskId, mimeType, buffer, resultUrl, "remote");
}

export async function persistMediaResult(taskId: string, resultUrl: string | undefined) {
  if (!resultUrl) return undefined;

  try {
    const dataResult = await persistDataUrl(taskId, resultUrl);
    if (dataResult) return dataResult;

    const parsedUrl = new URL(resultUrl);
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return persistRemoteUrl(taskId, resultUrl);
    }

    return {
      originalUrl: resultUrl,
      source: "remote-skipped",
      warning: `不支持的媒体结果协议：${parsedUrl.protocol}`
    } satisfies MediaResultStorage;
  } catch (error) {
    return {
      originalUrl: resultUrl,
      source: "remote-skipped",
      warning: `本地媒体结果保存失败：${error instanceof Error ? error.message : "未知错误"}`
    } satisfies MediaResultStorage;
  }
}
