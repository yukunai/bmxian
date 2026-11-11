import { NextResponse } from "next/server";
import { mediaStorageAdapterInfo } from "@/lib/server/media-storage-adapter";
import { authAdapterInfo } from "@/lib/server/session";
import { databaseAdapterInfo, getWorkspaceForClient } from "@/lib/server/store";

type ReadinessStatus = "ready" | "warning" | "blocked";

function paymentProvider() {
  return process.env.BMXIAN_PAYMENT_PROVIDER?.trim() || "manual";
}

function webhookConfigured() {
  return Boolean(
    process.env.BMXIAN_WEBHOOK_SECRET?.trim()
    || process.env.JIMENG_WEBHOOK_SECRET?.trim()
    || process.env.VOLCENGINE_WEBHOOK_SECRET?.trim()
    || process.env.KLING_WEBHOOK_SECRET?.trim()
  );
}

function providerConfigured(apiKey: string | undefined) {
  return Boolean(apiKey && !apiKey.includes("••••"));
}

function worstStatus(statuses: ReadinessStatus[]): ReadinessStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("warning")) return "warning";
  return "ready";
}

export async function GET() {
  const storage = databaseAdapterInfo();
  const mediaStorage = mediaStorageAdapterInfo();
  const auth = authAdapterInfo();
  const workspace = await getWorkspaceForClient();
  const remoteProviders = workspace.providerConfigs.filter((provider) =>
    provider.enabled && !provider.baseUrl.startsWith("local://")
  );
  const configuredRemoteProviders = remoteProviders.filter((provider) => providerConfigured(provider.apiKey));
  const payment = paymentProvider();
  const checks = [
    {
      id: "storage",
      label: "数据存储",
      status: storage.productionReady ? "ready" : "warning",
      detail: storage.productionReady
        ? `${storage.label} 已启用。`
        : "当前使用本地 JSON，适合开发和演示；生产建议切到 Postgres/Supabase/Neon。"
    },
    {
      id: "media-storage",
      label: "媒体存储",
      status: mediaStorage.productionReady ? "ready" : "warning",
      detail: mediaStorage.productionReady
        ? `${mediaStorage.label} 已启用。`
        : mediaStorage.id === "local"
          ? "当前使用本地 /generated 与 /uploads，适合开发和演示；生产建议接对象存储。"
          : `${mediaStorage.label} 已预留，仍需补齐上传实现或缺失环境变量。`
    },
    {
      id: "auth",
      label: "账号认证",
      status: auth.productionReady ? "ready" : "warning",
      detail: auth.productionReady
        ? "受信任网关认证已启用。"
        : "当前使用本地 cookie，会话适合开发；生产建议接 SSO/反向代理认证。"
    },
    {
      id: "providers",
      label: "模型 Provider",
      status: configuredRemoteProviders.length > 0 ? "ready" : "warning",
      detail: configuredRemoteProviders.length > 0
        ? `${configuredRemoteProviders.length} 个远程 Provider 已配置密钥。`
        : "未检测到远程 Provider 密钥，生成会继续使用 Demo fallback。"
    },
    {
      id: "key-vault",
      label: "账号密钥库",
      status: workspace.keyVault.length > 0 ? "ready" : "warning",
      detail: workspace.keyVault.length > 0
        ? `${workspace.keyVault.length} 个密钥已进入账号级密钥库。`
        : "尚未创建账号级密钥库条目，生产建议把供应商、支付和集成密钥集中管理。"
    },
    {
      id: "webhooks",
      label: "媒体回调验签",
      status: webhookConfigured() ? "ready" : "warning",
      detail: webhookConfigured()
        ? "已配置至少一个 webhook secret。"
        : "未配置 webhook secret，本地回调不阻塞；生产需要配置通用或供应商 HMAC secret。"
    },
    {
      id: "billing",
      label: "支付计费",
      status: payment === "manual" ? "warning" : "ready",
      detail: payment === "manual"
        ? "当前为手动账单预览，尚未接真实支付通道。"
        : `支付 Provider 已设置为 ${payment}。`
    },
    {
      id: "payment-checkout",
      label: "付款会话",
      status: workspace.paymentSessions.length > 0 || payment !== "manual" ? "ready" : "warning",
      detail: workspace.paymentSessions.length > 0
        ? `${workspace.paymentSessions.length} 个付款会话已创建，可用于本地收款核对。`
        : "尚未创建付款会话；可以先使用本地手动付款单闭环，后续替换为真实支付 Provider。"
    },
    {
      id: "supplier-invoices",
      label: "供应商账单",
      status: workspace.supplierInvoices.length > 0 ? "ready" : "warning",
      detail: workspace.supplierInvoices.length > 0
        ? `${workspace.supplierInvoices.length} 份供应商账单已导入。`
        : "尚未导入供应商账单；生产对账需要导入即梦、可灵或模型供应商月账单。"
    },
    {
      id: "integrations",
      label: "Scenelet / LoamTrace",
      status: "warning",
      detail: "已保留集成位，真实适配器需等待后续接入。"
    }
  ] satisfies Array<{ id: string; label: string; status: ReadinessStatus; detail: string }>;

  return NextResponse.json({
    status: worstStatus(checks.map((check) => check.status)),
    generatedAt: new Date().toISOString(),
    checks,
    storage,
    mediaStorage,
    auth
  });
}
