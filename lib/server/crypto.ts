import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function encryptionKey() {
  const secret = process.env.BMXIAN_SECRET_KEY ?? "bmxian-local-dev-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  if (!value) return "";

  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ["enc", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(value: string) {
  if (!value || !value.startsWith("enc:")) return value;

  const [, ivText, tagText, encryptedText] = value.split(":");
  const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function maskSecret(value: string) {
  const decrypted = decryptSecret(value);
  if (!decrypted) return "";
  if (decrypted.length <= 8) return "••••";
  return `${decrypted.slice(0, 3)}••••${decrypted.slice(-4)}`;
}
