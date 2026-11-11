import { join } from "node:path";

export type MediaStorageAdapterId = "local" | "s3" | "r2" | "oss" | "cos";

export type MediaStorageAdapterInfo = {
  id: MediaStorageAdapterId;
  requestedId: string;
  label: string;
  configured: boolean;
  persistent: boolean;
  productionReady: boolean;
  uploadImplemented: boolean;
  publicPrefixes: string[];
  generatedPath: string;
  uploadsPath: string;
  remoteFetchEnabled: boolean;
  maxBytes: number;
  availableAdapters: MediaStorageAdapterId[];
  requiredEnv: string[];
  missingEnv: string[];
  note: string;
};

const availableAdapters: MediaStorageAdapterId[] = ["local", "s3", "r2", "oss", "cos"];
const generatedPath = join(process.cwd(), "public", "generated");
const uploadsPath = join(process.cwd(), "public", "uploads");

function maxResultBytes() {
  const configured = Number(process.env.BMXIAN_MAX_MEDIA_RESULT_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : 50 * 1024 * 1024;
}

function requestedMediaStorageAdapter() {
  return process.env.BMXIAN_MEDIA_STORAGE_ADAPTER?.trim().toLowerCase() || "local";
}

function normalizeAdapterId(value: string): MediaStorageAdapterId {
  return availableAdapters.includes(value as MediaStorageAdapterId) ? value as MediaStorageAdapterId : "local";
}

function requiredEnvFor(adapter: MediaStorageAdapterId) {
  if (adapter === "local") return [];
  const base = [
    "BMXIAN_MEDIA_BUCKET",
    "BMXIAN_MEDIA_PUBLIC_BASE_URL",
    "BMXIAN_MEDIA_ACCESS_KEY_ID",
    "BMXIAN_MEDIA_SECRET_ACCESS_KEY"
  ];
  if (adapter === "s3") return [...base, "BMXIAN_MEDIA_REGION"];
  if (adapter === "r2") return [...base, "BMXIAN_MEDIA_ENDPOINT"];
  if (adapter === "oss") return [...base, "BMXIAN_MEDIA_ENDPOINT"];
  return [...base, "BMXIAN_MEDIA_REGION"];
}

function labelFor(adapter: MediaStorageAdapterId) {
  if (adapter === "s3") return "Amazon S3 compatible media storage";
  if (adapter === "r2") return "Cloudflare R2 media storage";
  if (adapter === "oss") return "Aliyun OSS media storage";
  if (adapter === "cos") return "Tencent COS media storage";
  return "Local media filesystem";
}

export function mediaStorageAdapterInfo(): MediaStorageAdapterInfo {
  const requestedId = requestedMediaStorageAdapter();
  const id = normalizeAdapterId(requestedId);
  const requiredEnv = requiredEnvFor(id);
  const missingEnv = requiredEnv.filter((name) => !process.env[name]?.trim());
  const uploadImplemented = id === "local";
  const configured = missingEnv.length === 0;

  return {
    id,
    requestedId,
    label: labelFor(id),
    configured,
    persistent: id !== "local",
    productionReady: id !== "local" && configured && uploadImplemented,
    uploadImplemented,
    publicPrefixes: ["/generated/", "/uploads/"],
    generatedPath,
    uploadsPath,
    remoteFetchEnabled: process.env.BMXIAN_STORE_REMOTE_MEDIA === "true",
    maxBytes: maxResultBytes(),
    availableAdapters,
    requiredEnv,
    missingEnv,
    note: id === "local"
      ? "Using local public directories for single-machine demos and portable backups."
      : uploadImplemented
        ? `${labelFor(id)} is configured for media storage.`
        : `${labelFor(id)} is reserved; upload implementation is not enabled yet.`
  };
}
