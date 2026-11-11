"use client";

import { useState } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import type { Artifact } from "@/lib/workbench-data";
import { MediaPreview, StatusPill, artifactMediaUrl, cx } from "../shared";
import type { ComplianceResult } from "../shared";
import { useWorkbench } from "../store";

export function AssetsView() {
  const { artifacts, updateArtifact, deleteArtifact, downloadArtifacts, scheduleArtifact } = useWorkbench();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scheduledId, setScheduledId] = useState<string | null>(null);
  const [complianceResults, setComplianceResults] = useState<Record<string, ComplianceResult>>({});

  function artifactText(artifact: Artifact) {
    return [
      artifact.title,
      `类型：${artifact.type}`,
      `来源：${artifact.source}`,
      "",
      artifact.body
    ].join("\n");
  }

  async function copyArtifact(artifact: Artifact) {
    const text = artifactText(artifact);
    setCopiedId(artifact.id);
    window.setTimeout(() => setCopiedId((current) => (current === artifact.id ? null : current)), 1300);

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  async function checkCompliance(artifact: Artifact) {
    const response = await fetch("/api/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${artifact.title}\n${artifact.body}` })
    });

    if (!response.ok) return;
    const result = (await response.json()) as ComplianceResult;
    setComplianceResults((current) => ({
      ...current,
      [artifact.id]: result
    }));
  }

  return (
    <div className="content-grid">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Saved artifacts</span>
            <h2>作品集</h2>
          </div>
          <div className="button-row">
            <button className="primary-compact" type="button" onClick={() => { void downloadArtifacts("md"); }}>
              <Download size={16} />
              导出 MD
            </button>
            <button className="ghost-button" type="button" onClick={() => { void downloadArtifacts("json"); }}>
              JSON
            </button>
          </div>
        </div>
        <div className="asset-grid">
          {artifacts.map((artifact) => (
            <article className="asset-card" key={artifact.id}>
              <div>
                <span>{artifact.type}</span>
                <StatusPill status={artifact.status} />
              </div>
              <h3>{artifact.title}</h3>
              <MediaPreview url={artifactMediaUrl(artifact)} type={artifact.type} />
              <p>{artifact.body}</p>
              <footer>
                <small>{artifact.source}</small>
                <span className="asset-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      void updateArtifact({
                        ...artifact,
                        status: artifact.status === "已保存" ? "草稿" : "已保存"
                      });
                    }}
                  >
                    {artifact.status === "已保存" ? "转草稿" : "保存"}
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      void checkCompliance(artifact);
                    }}
                  >
                    合规
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setScheduledId(artifact.id);
                      void scheduleArtifact(artifact).finally(() => setScheduledId(null));
                    }}
                  >
                    {scheduledId === artifact.id ? "排期中" : "排期"}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`复制 ${artifact.title}`}
                    onClick={() => {
                      void copyArtifact(artifact);
                    }}
                  >
                    <Copy size={16} />
                  </button>
                  {copiedId === artifact.id && <small>已复制</small>}
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    aria-label={`删除 ${artifact.title}`}
                    onClick={() => {
                      void deleteArtifact(artifact.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </footer>
              {complianceResults[artifact.id] && (
                <div className={cx("compliance-box", complianceResults[artifact.id].ok ? "ok" : "risk")}>
                  <strong>风险 {complianceResults[artifact.id].riskLevel}</strong>
                  {complianceResults[artifact.id].issues.length === 0 ? (
                    <p>未发现基础风险词。</p>
                  ) : (
                    complianceResults[artifact.id].issues.slice(0, 3).map((issue) => (
                      <p key={issue.id}>{issue.label}：{issue.text}</p>
                    ))
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
