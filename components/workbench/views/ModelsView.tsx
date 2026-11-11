"use client";

import { useState } from "react";
import { BadgeCheck, CheckCircle2, CircleDot, Clock3, KeyRound, LockKeyhole, SlidersHorizontal, Zap } from "lucide-react";
import { providerConfigForModel, providerRoutingStrategyLabels } from "@/lib/gateway-types";
import type { ProviderRoutingStrategy } from "@/lib/gateway-types";
import type { GatewayProviderConfig, ProviderTestResult } from "@/lib/gateway-types";
import { modelEngines } from "@/lib/workbench-data";
import { StatusPill, cx } from "../shared";
import { useWorkbench } from "../store";

const routingStrategies = Object.entries(providerRoutingStrategyLabels) as Array<[ProviderRoutingStrategy, string]>;

export function ModelsView() {
  const { selectedModelId, setSelectedModelId, providerConfigs, setProviderConfigs, routingPolicy, setRoutingPolicy } = useWorkbench();
  const activeConfig = providerConfigForModel(selectedModelId, providerConfigs, { routingPolicy });
  const autoProvider = providerConfigForModel("auto", providerConfigs, { routingPolicy });
  const enabledCount = providerConfigs.filter((config) => config.enabled && (config.apiKey || config.id === "demo")).length;
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  function updateConfig(patch: Partial<GatewayProviderConfig>) {
    setProviderConfigs(
      providerConfigs.map((config) =>
        config.id === activeConfig.id ? { ...config, ...patch } : config
      )
    );
    setTestResult(null);
  }

  function updateRoutingStrategy(textStrategy: ProviderRoutingStrategy) {
    setRoutingPolicy({
      textStrategy,
      updatedAt: new Date().toISOString()
    });
    setSelectedModelId("auto");
    setTestResult(null);
  }

  async function testActiveProvider() {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeConfig })
      });
      const payload = await response.json();

      if (!response.ok) {
        setTestResult({
          ok: false,
          status: "network-error",
          providerId: activeConfig.id,
          label: activeConfig.label,
          model: activeConfig.model,
          endpoint: activeConfig.baseUrl,
          message: payload.error ?? "Provider 测试失败",
          suggestion: "检查本地 dev server 和 Provider 配置后重试。",
          checkedAt: new Date().toISOString()
        });
        return;
      }

      setTestResult(payload as ProviderTestResult);
    } catch (error) {
      setTestResult({
        ok: false,
        status: "network-error",
        providerId: activeConfig.id,
        label: activeConfig.label,
        model: activeConfig.model,
        endpoint: activeConfig.baseUrl,
        message: error instanceof Error ? error.message : "Provider 测试失败",
        suggestion: "检查本机网络和 Next.js dev server。",
        checkedAt: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="content-grid two">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Model gateway</span>
            <h2>引擎中心</h2>
          </div>
          <button className="primary-compact" type="button" onClick={() => setSelectedModelId("auto")}>
            <SlidersHorizontal size={16} />
            路由策略
          </button>
        </div>
        <div className="model-list">
          {modelEngines.map((model) => (
            <button
              className={cx("model-row", selectedModelId === model.id && "active")}
              key={model.id}
              type="button"
              onClick={() => setSelectedModelId(model.id)}
            >
              <span className="model-logo">{model.provider.slice(0, 2)}</span>
              <span>
                <strong>{model.name}</strong>
                <small>{model.provider} / {model.lane}</small>
              </span>
              <StatusPill
                status={
                  providerConfigForModel(model.id, providerConfigs).enabled
                    ? "已接入"
                    : model.status
                }
              />
            </button>
          ))}
        </div>
        <div className="route-policy-box">
          <div className="section-title-row">
            <h3>自动路由</h3>
            <span>{providerRoutingStrategyLabels[routingPolicy.textStrategy]}</span>
          </div>
          <div className="routing-options" role="group" aria-label="自动路由策略">
            {routingStrategies.map(([strategy, label]) => (
              <button
                className={cx("routing-option", routingPolicy.textStrategy === strategy && "active")}
                key={strategy}
                type="button"
                onClick={() => updateRoutingStrategy(strategy)}
              >
                {label}
              </button>
            ))}
          </div>
          <p>当前优先：{autoProvider.label}</p>
        </div>
      </section>

      <section className="data-panel detail">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Secure config</span>
            <h2>{activeConfig.label}</h2>
          </div>
          <LockKeyhole size={18} />
        </div>
        <div className="key-form">
          <label>
            <span>供应商</span>
            <input value={activeConfig.label} onChange={(event) => updateConfig({ label: event.target.value })} />
          </label>
          <label>
            <span>Endpoint</span>
            <input value={activeConfig.baseUrl} onChange={(event) => updateConfig({ baseUrl: event.target.value })} />
          </label>
          <label>
            <span>Model ID</span>
            <input value={activeConfig.model} onChange={(event) => updateConfig({ model: event.target.value })} />
          </label>
          <label>
            <span>API Key</span>
            <input
              type="password"
              value={activeConfig.apiKey}
              onChange={(event) => updateConfig({ apiKey: event.target.value })}
              placeholder="sk-..."
            />
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={activeConfig.enabled}
              onChange={(event) => updateConfig({ enabled: event.target.checked })}
            />
            <span>启用这个 Provider 参与自动路由</span>
          </label>
          <button className="send-button" type="button" onClick={testActiveProvider} disabled={testing}>
            {testing ? <Clock3 size={17} /> : <KeyRound size={17} />}
            {testing ? "测试中" : "测试连接"}
          </button>
        </div>
        {testResult && (
          <div className={cx("provider-diagnostic", testResult.ok ? "ok" : "failed")}>
            <div>
              {testResult.ok ? <CheckCircle2 size={17} /> : <CircleDot size={17} />}
              <strong>{testResult.ok ? "连接可用" : "需要处理"}</strong>
              {testResult.latencyMs !== undefined && <span>{testResult.latencyMs}ms</span>}
            </div>
            <p>{testResult.message}</p>
            {testResult.suggestion && <small>{testResult.suggestion}</small>}
          </div>
        )}
        <div className="structured-box">
          <h3>路由规则</h3>
          <p><Zap size={15} /> 已接入 {enabledCount} 个 Provider。文本自动路由使用「{providerRoutingStrategyLabels[routingPolicy.textStrategy]}」，当前优先尝试「{autoProvider.label}」。</p>
          <p><BadgeCheck size={15} /> API Key 会写入本地服务端数据库并加密，浏览器侧只保留遮罩值；生产版需要升级到账户隔离和团队权限。</p>
        </div>
      </section>
    </div>
  );
}
