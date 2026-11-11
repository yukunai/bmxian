"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CreditCard, Download, KeyRound, Plus, Trash2 } from "lucide-react";
import { metricCards, pluginReservations, scenarioCards } from "@/lib/workbench-data";
import type { KeyVaultSecret, PaymentSession, SupplierInvoice, TeamMember, TeamMemberRole } from "@/lib/workbench-data";
import { StatusPill, appStorageKey, authAdapterText, formatCnyFromCents, keyVaultScopeText, paymentSessionStatusText, teamRoleText, teamStatusText } from "../shared";
import type { AuthStatus, IntegrationStatus, MetricSnapshot } from "../shared";
import { useWorkbench } from "../store";

export function SettingsView() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [metrics, setMetrics] = useState<MetricSnapshot[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | undefined>();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [keyVault, setKeyVault] = useState<KeyVaultSecret[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([]);
  const [keyVaultDraft, setKeyVaultDraft] = useState<{
    name: string;
    scope: KeyVaultSecret["scope"];
    linkedId: string;
    secretValue: string;
  }>({
    name: "",
    scope: "provider",
    linkedId: "",
    secretValue: ""
  });
  const [teamDraft, setTeamDraft] = useState<{ name: string; email: string; role: TeamMemberRole }>({
    name: "",
    email: "",
    role: "editor"
  });
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [teamStatus, setTeamStatus] = useState("");
  const [keyVaultStatus, setKeyVaultStatus] = useState("");
  const [supplierInvoiceStatus, setSupplierInvoiceStatus] = useState("");
  const [paymentSessionStatus, setPaymentSessionStatus] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAuthStatus() {
      const response = await fetch("/api/system/auth");
      if (!response.ok) return;
      const payload = (await response.json()) as AuthStatus;
      if (!ignore) setAuthStatus(payload);
    }

    void loadAuthStatus();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadIntegrations() {
      const response = await fetch("/api/integrations");
      if (!response.ok) return;
      const payload = (await response.json()) as { integrations: IntegrationStatus[] };
      if (!ignore) setIntegrations(payload.integrations);
    }

    void loadIntegrations();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadMetrics() {
      const response = await fetch("/api/metrics");
      if (!response.ok) return;
      const payload = (await response.json()) as { metrics: MetricSnapshot[] };
      if (!ignore) setMetrics(payload.metrics);
    }

    void loadMetrics();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSupplierInvoices() {
      const response = await fetch("/api/billing/supplier-invoices");
      if (!response.ok) return;
      const payload = (await response.json()) as { supplierInvoices: SupplierInvoice[] };
      if (!ignore) setSupplierInvoices(payload.supplierInvoices);
    }

    void loadSupplierInvoices();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadPaymentSessions() {
      const response = await fetch("/api/billing/checkout");
      if (!response.ok) return;
      const payload = (await response.json()) as { paymentSessions: PaymentSession[] };
      if (!ignore) setPaymentSessions(payload.paymentSessions);
    }

    void loadPaymentSessions();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadKeyVault() {
      const response = await fetch("/api/key-vault");
      if (!response.ok) return;
      const payload = (await response.json()) as { secrets: KeyVaultSecret[] };
      if (!ignore) setKeyVault(payload.secrets);
    }

    void loadKeyVault();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadTeamMembers() {
      const response = await fetch("/api/team/members");
      if (!response.ok) return;
      const payload = (await response.json()) as { members: TeamMember[] };
      if (!ignore) setTeamMembers(payload.members);
    }

    void loadTeamMembers();
    return () => {
      ignore = true;
    };
  }, []);

  async function saveKeyVaultSecret() {
    if (!keyVaultDraft.name.trim() || !keyVaultDraft.secretValue.trim()) return;
    setKeyVaultStatus("保存中");
    const response = await fetch("/api/key-vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: keyVaultDraft.name.trim(),
        scope: keyVaultDraft.scope,
        linkedId: keyVaultDraft.linkedId.trim() || undefined,
        secretValue: keyVaultDraft.secretValue
      })
    });

    if (!response.ok) {
      setKeyVaultStatus("保存失败");
      return;
    }

    const payload = (await response.json()) as { secrets: KeyVaultSecret[] };
    setKeyVault(payload.secrets);
    setKeyVaultDraft({ name: "", scope: "provider", linkedId: "", secretValue: "" });
    setKeyVaultStatus("已保存");
  }

  async function removeKeyVaultSecret(id: string) {
    setKeyVaultStatus("删除中");
    const response = await fetch("/api/key-vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      setKeyVaultStatus("删除失败");
      return;
    }

    const payload = (await response.json()) as { secrets: KeyVaultSecret[] };
    setKeyVault(payload.secrets);
    setKeyVaultStatus("已删除");
  }

  async function importSupplierInvoiceFile(file: File | undefined) {
    if (!file) return;
    setSupplierInvoiceStatus("导入中");
    const csv = await file.text();
    const response = await fetch("/api/billing/supplier-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv })
    });

    if (!response.ok) {
      setSupplierInvoiceStatus("导入失败");
      return;
    }

    const payload = (await response.json()) as { imported: number; supplierInvoices: SupplierInvoice[] };
    setSupplierInvoices(payload.supplierInvoices);
    setSupplierInvoiceStatus(`已导入 ${payload.imported} 份`);
  }

  async function removeSupplierInvoice(id: string) {
    setSupplierInvoiceStatus("删除中");
    const response = await fetch("/api/billing/supplier-invoices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      setSupplierInvoiceStatus("删除失败");
      return;
    }

    const payload = (await response.json()) as { supplierInvoices: SupplierInvoice[] };
    setSupplierInvoices(payload.supplierInvoices);
    setSupplierInvoiceStatus("已删除");
  }

  async function createPaymentSession() {
    setPaymentSessionStatus("生成中");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      setPaymentSessionStatus("生成失败");
      return;
    }

    const payload = (await response.json()) as { paymentSessions: PaymentSession[] };
    setPaymentSessions(payload.paymentSessions);
    setPaymentSessionStatus("已生成");
  }

  async function updatePaymentSession(id: string, status: PaymentSession["status"]) {
    setPaymentSessionStatus("更新中");
    const response = await fetch("/api/billing/checkout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });

    if (!response.ok) {
      setPaymentSessionStatus("更新失败");
      return;
    }

    const payload = (await response.json()) as { paymentSessions: PaymentSession[] };
    setPaymentSessions(payload.paymentSessions);
    setPaymentSessionStatus(status === "paid" ? "已支付" : status === "cancelled" ? "已取消" : "已更新");
  }

  async function saveTeamMember() {
    if (!teamDraft.name.trim() || !teamDraft.email.trim()) return;
    setTeamStatus("保存中");
    const response = await fetch("/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...teamDraft,
        name: teamDraft.name.trim(),
        email: teamDraft.email.trim(),
        status: "invited"
      })
    });

    if (!response.ok) {
      setTeamStatus("保存失败");
      return;
    }

    const payload = (await response.json()) as { members: TeamMember[] };
    setTeamMembers(payload.members);
    setTeamDraft({ name: "", email: "", role: "editor" });
    setTeamStatus("已保存");
  }

  async function removeTeamMember(id: string) {
    setTeamStatus("删除中");
    const response = await fetch("/api/team/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      setTeamStatus("删除失败");
      return;
    }

    const payload = (await response.json()) as { members: TeamMember[] };
    setTeamMembers(payload.members);
    setTeamStatus("已删除");
  }

  async function downloadWorkspaceBackup() {
    const response = await fetch("/api/workspace/export");
    if (!response.ok) return;

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bmxian-workspace-backup.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  async function importWorkspaceBackup(file: File | undefined) {
    if (!file) return;
    setWorkspaceStatus("导入中");

    const payload = JSON.parse(await file.text());
    const response = await fetch("/api/workspace/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setWorkspaceStatus("导入失败");
      return;
    }

    window.localStorage.removeItem(appStorageKey);
    window.location.reload();
  }

  async function resetWorkspaceData() {
    setWorkspaceStatus("重置中");
    const response = await fetch("/api/workspace/reset", { method: "POST" });
    if (!response.ok) {
      setWorkspaceStatus("重置失败");
      return;
    }

    window.localStorage.removeItem(appStorageKey);
    window.location.reload();
  }

  return (
    <div className="content-grid two">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Product system</span>
            <h2>增长面板</h2>
          </div>
          <StatusPill status="MVP" />
        </div>
        <div className="metric-grid">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            const liveMetric = metrics.find((item) => item.label === metric.label) ?? metric;
            return (
              <article className="metric-card" key={metric.label}>
                <Icon size={18} />
                <span>{metric.label}</span>
                <strong>{liveMetric.value}</strong>
                <p>{liveMetric.detail}</p>
              </article>
            );
          })}
        </div>
        <div className="scenario-grid">
          {scenarioCards.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <article className="scenario-card" key={scenario.title}>
                <Icon size={18} />
                <h3>{scenario.title}</h3>
                <p>{scenario.text}</p>
              </article>
            );
          })}
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>工作区数据</h3>
            <span>{workspaceStatus || "本地"}</span>
          </div>
          <div className="button-row">
            <button className="primary-compact" type="button" onClick={() => { void downloadWorkspaceBackup(); }}>
              <Download size={16} />
              导出备份
            </button>
            <label className="ghost-button upload-control">
              导入备份
              <input
                type="file"
                accept="application/json"
                onChange={(event) => {
                  void importWorkspaceBackup(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button className="danger-button" type="button" onClick={() => { void resetWorkspaceData(); }}>
              <Trash2 size={15} />
              重置工作区
            </button>
          </div>
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>账号认证</h3>
            <span>{authStatus?.auth.productionReady ? "生产就绪" : "本地"}</span>
          </div>
          {authStatus && (
            <div className="auth-facts">
              <div>
                <span>方式</span>
                <strong>{authAdapterText(authStatus.auth.adapter)}</strong>
              </div>
              <div>
                <span>用户</span>
                <strong>{authStatus.user.email}</strong>
              </div>
              <div>
                <span>缺少</span>
                <strong>{authStatus.auth.missingEnv.length ? authStatus.auth.missingEnv.join(", ") : "无"}</strong>
              </div>
            </div>
          )}
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>账号密钥库</h3>
            <span>{keyVaultStatus || `${keyVault.length} 个`}</span>
          </div>
          <div className="team-list">
            {keyVault.map((secret) => (
              <div className="team-row" key={secret.id}>
                <span>
                  <strong>{secret.name}</strong>
                  <small>{secret.linkedId || secret.id}</small>
                </span>
                <span>{keyVaultScopeText(secret.scope)}</span>
                <code>{secret.maskedValue || "••••"}</code>
                <button
                  className="icon-button danger-icon"
                  type="button"
                  aria-label={`删除密钥 ${secret.name}`}
                  onClick={() => {
                    void removeKeyVaultSecret(secret.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="team-form">
            <input
              value={keyVaultDraft.name}
              onChange={(event) => setKeyVaultDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="密钥名称"
            />
            <select
              value={keyVaultDraft.scope}
              onChange={(event) => setKeyVaultDraft((current) => ({ ...current, scope: event.target.value as KeyVaultSecret["scope"] }))}
              aria-label="密钥类型"
            >
              <option value="provider">模型</option>
              <option value="webhook">回调</option>
              <option value="payment">支付</option>
              <option value="integration">集成</option>
              <option value="custom">自定义</option>
            </select>
            <input
              value={keyVaultDraft.linkedId}
              onChange={(event) => setKeyVaultDraft((current) => ({ ...current, linkedId: event.target.value }))}
              placeholder="关联 ID"
            />
            <input
              value={keyVaultDraft.secretValue}
              onChange={(event) => setKeyVaultDraft((current) => ({ ...current, secretValue: event.target.value }))}
              placeholder="密钥值"
              type="password"
            />
            <button className="primary-compact" type="button" onClick={() => { void saveKeyVaultSecret(); }}>
              <KeyRound size={15} />
              保存密钥
            </button>
          </div>
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>供应商账单</h3>
            <span>{supplierInvoiceStatus || `${supplierInvoices.length} 份`}</span>
          </div>
          <div className="team-list">
            {supplierInvoices.map((invoice) => (
              <div className="team-row" key={invoice.id}>
                <span>
                  <strong>{invoice.providerLabel}</strong>
                  <small>{invoice.externalInvoiceId || invoice.id}</small>
                </span>
                <span>{invoice.period}</span>
                <code>{formatCnyFromCents(invoice.amountCents)}</code>
                <button
                  className="icon-button danger-icon"
                  type="button"
                  aria-label={`删除账单 ${invoice.providerLabel}`}
                  onClick={() => {
                    void removeSupplierInvoice(invoice.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="button-row">
            <label className="ghost-button upload-control">
              导入账单
              <input
                type="file"
                accept=".csv,text/csv"
                aria-label="导入供应商账单 CSV"
                onChange={(event) => {
                  void importSupplierInvoiceFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>付款会话</h3>
            <span>{paymentSessionStatus || `${paymentSessions.length} 个`}</span>
          </div>
          <div className="team-list">
            {paymentSessions.map((session) => (
              <div className="team-row payment-row" key={session.id}>
                <span>
                  <strong>{session.invoiceId}</strong>
                  <small>{session.provider} · {session.period}</small>
                </span>
                <span>{paymentSessionStatusText(session.status)}</span>
                <code>{formatCnyFromCents(session.amountCents)}</code>
                <span className="team-actions">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`标记已支付 ${session.id}`}
                    disabled={session.status !== "pending"}
                    onClick={() => {
                      void updatePaymentSession(session.id, "paid");
                    }}
                  >
                    <BadgeCheck size={15} />
                  </button>
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    aria-label={`取消付款单 ${session.id}`}
                    disabled={session.status !== "pending"}
                    onClick={() => {
                      void updatePaymentSession(session.id, "cancelled");
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="button-row">
            <button className="primary-compact" type="button" onClick={() => { void createPaymentSession(); }}>
              <CreditCard size={15} />
              生成付款单
            </button>
          </div>
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>团队权限</h3>
            <span>{teamStatus || `${teamMembers.length} 人`}</span>
          </div>
          <div className="team-list">
            {teamMembers.map((member) => (
              <div className="team-row" key={member.id}>
                <span>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </span>
                <span>{teamRoleText(member.role)}</span>
                <StatusPill status={teamStatusText(member.status)} />
                <button
                  className="icon-button danger-icon"
                  type="button"
                  aria-label={`删除成员 ${member.name}`}
                  disabled={member.role === "owner"}
                  onClick={() => {
                    void removeTeamMember(member.id);
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="team-form">
            <input
              value={teamDraft.name}
              onChange={(event) => setTeamDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="成员姓名"
            />
            <input
              value={teamDraft.email}
              onChange={(event) => setTeamDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="email@example.com"
            />
            <select
              value={teamDraft.role}
              onChange={(event) => setTeamDraft((current) => ({ ...current, role: event.target.value as TeamMemberRole }))}
              aria-label="成员角色"
            >
              <option value="admin">管理员</option>
              <option value="editor">编辑</option>
              <option value="viewer">只读</option>
            </select>
            <button className="primary-compact" type="button" onClick={() => { void saveTeamMember(); }}>
              <Plus size={15} />
              添加成员
            </button>
          </div>
        </div>
      </section>

      <section className="data-panel detail">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Future plugins</span>
            <h2>预留插件</h2>
          </div>
        </div>
        <div className="plugin-list">
          {pluginReservations.map((plugin) => {
            const Icon = plugin.icon;
            const integration = integrations.find((item) => item.name === plugin.name);
            return (
              <article className="plugin-card" key={plugin.name}>
                <Icon size={20} />
                <div>
                  <span>{plugin.role}</span>
                  <h3>{plugin.name}</h3>
                  <p>{plugin.description}</p>
                  {integration && (
                    <dl className="integration-facts">
                      <div>
                        <dt>能力</dt>
                        <dd>{integration.capability}</dd>
                      </div>
                      <div>
                        <dt>Base URL</dt>
                        <dd>{integration.baseUrlConfigured ? "已配置" : integration.baseUrlEnv}</dd>
                      </div>
                      <div>
                        <dt>API Key</dt>
                        <dd>{integration.apiKeyConfigured ? "已配置" : integration.apiKeyEnv}</dd>
                      </div>
                    </dl>
                  )}
                </div>
                <StatusPill status={integration?.status ?? "预留"} />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
