import { NextResponse } from "next/server";

type IntegrationConfig = {
  id: "scenelet" | "loamtrace";
  name: string;
  role: string;
  description: string;
  capability: string;
  baseUrlEnv: string;
  apiKeyEnv: string;
};

const integrations: IntegrationConfig[] = [
  {
    id: "scenelet",
    name: "Scenelet",
    role: "视频创作插件",
    description: "未来接入脚本转分镜、图生视频、短视频任务队列。第一版只预留 video.generate 接口。",
    capability: "video.generate",
    baseUrlEnv: "SCENELET_BASE_URL",
    apiKeyEnv: "SCENELET_API_KEY"
  },
  {
    id: "loamtrace",
    name: "LoamTrace",
    role: "可信写作插件",
    description: "未来接入资料核验、引用追踪、事实检查和报告/PPT 证据链。第一版只预留 source.verify 接口。",
    capability: "source.verify",
    baseUrlEnv: "LOAMTRACE_BASE_URL",
    apiKeyEnv: "LOAMTRACE_API_KEY"
  }
];

function statusFor(baseUrlConfigured: boolean, apiKeyConfigured: boolean) {
  if (baseUrlConfigured && apiKeyConfigured) return "可启用";
  if (baseUrlConfigured || apiKeyConfigured) return "待配置";
  return "预留";
}

export async function GET() {
  return NextResponse.json({
    integrations: integrations.map((integration) => {
      const baseUrlConfigured = Boolean(process.env[integration.baseUrlEnv]);
      const apiKeyConfigured = Boolean(process.env[integration.apiKeyEnv]);

      return {
        ...integration,
        status: statusFor(baseUrlConfigured, apiKeyConfigured),
        configured: baseUrlConfigured && apiKeyConfigured,
        baseUrlConfigured,
        apiKeyConfigured
      };
    })
  });
}
