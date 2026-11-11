import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookSignatureStatus = "not_configured" | "generic_secret" | "provider_hmac" | "failed";
export type ProviderErrorCategory =
  | "quota"
  | "auth"
  | "rate_limit"
  | "content_policy"
  | "timeout"
  | "provider_error"
  | "unknown";

export type WebhookSignatureVerification = {
  authorized: boolean;
  status: WebhookSignatureStatus;
  providerId?: string;
  checkedHeaders: string[];
  message?: string;
};

function genericWebhookSecret() {
  return process.env.BMXIAN_WEBHOOK_SECRET?.trim();
}

function providerWebhookSecret(providerId: string | undefined) {
  if (providerId === "jimeng") {
    return process.env.JIMENG_WEBHOOK_SECRET?.trim() || process.env.VOLCENGINE_WEBHOOK_SECRET?.trim();
  }
  if (providerId === "kling") return process.env.KLING_WEBHOOK_SECRET?.trim();
  return undefined;
}

function headerProviderId(request: Request) {
  return request.headers.get("x-bmxian-provider-id")?.trim()
    || request.headers.get("x-provider-id")?.trim()
    || undefined;
}

function normalizeSignature(value: string | null) {
  return value?.trim().replace(/^sha256=/i, "").toLowerCase();
}

function safeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hmacSignature(secret: string, rawBody: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function signatureHeaders(request: Request, providerId: string | undefined) {
  const candidates = [
    "x-bmxian-signature",
    "x-provider-signature",
    providerId === "jimeng" ? "x-jimeng-signature" : "",
    providerId === "jimeng" ? "x-volcengine-signature" : "",
    providerId === "kling" ? "x-kling-signature" : ""
  ].filter(Boolean);

  return candidates.map((name) => ({
    name,
    value: normalizeSignature(request.headers.get(name))
  }));
}

export function verifyWebhookSignature(
  request: Request,
  rawBody: string,
  bodyProviderId?: string
): WebhookSignatureVerification {
  const providerId = bodyProviderId || headerProviderId(request);
  const checkedHeaders = ["x-bmxian-webhook-secret", "authorization"];
  const genericSecret = genericWebhookSecret();
  const providerSecret = providerWebhookSecret(providerId);
  const headerSecret = request.headers.get("x-bmxian-webhook-secret")?.trim();
  const bearerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (genericSecret && (headerSecret === genericSecret || bearerSecret === genericSecret)) {
    return { authorized: true, status: "generic_secret", providerId, checkedHeaders };
  }

  if (providerSecret) {
    const expected = hmacSignature(providerSecret, rawBody);
    const signatures = signatureHeaders(request, providerId);
    const matched = signatures.some((signature) =>
      signature.value ? safeHexEqual(signature.value, expected) : false
    );

    return {
      authorized: matched,
      status: matched ? "provider_hmac" : "failed",
      providerId,
      checkedHeaders: [...checkedHeaders, ...signatures.map((signature) => signature.name)],
      message: matched ? undefined : "Provider webhook HMAC signature is missing or invalid."
    };
  }

  if (genericSecret) {
    return {
      authorized: false,
      status: "failed",
      providerId,
      checkedHeaders,
      message: "Generic webhook secret is configured but the request did not include a valid secret."
    };
  }

  return {
    authorized: true,
    status: "not_configured",
    providerId,
    checkedHeaders
  };
}

export function classifyProviderError(message: string | undefined): ProviderErrorCategory {
  const value = message?.toLowerCase() ?? "";
  if (!value.trim()) return "unknown";
  if (/(余额|quota|credit|insufficient|balance|欠费)/i.test(value)) return "quota";
  if (/(unauthorized|authentication|api key|invalid key|鉴权|认证|密钥|签名)/i.test(value)) return "auth";
  if (/(rate limit|too many|限流|频率|429)/i.test(value)) return "rate_limit";
  if (/(policy|safety|违规|敏感|审核|content)/i.test(value)) return "content_policy";
  if (/(timeout|timed out|超时)/i.test(value)) return "timeout";
  return "provider_error";
}
