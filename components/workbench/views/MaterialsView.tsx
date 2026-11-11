"use client";

import { useState } from "react";
import { FileStack, Layers3, Trash2, Upload } from "lucide-react";
import { formatBytes } from "../shared";
import { useWorkbench } from "../store";

export function MaterialsView() {
  const { materials, loraAssets, uploadMaterial, uploadLoraAsset, deleteMaterial, deleteLoraAsset } = useWorkbench();
  const [uploading, setUploading] = useState(false);
  const [uploadingLora, setUploadingLora] = useState(false);
  const [tags, setTags] = useState("商品图, 参考素材");
  const [loraMeta, setLoraMeta] = useState({
    kind: "角色",
    baseModel: "SDXL / FLUX compatible",
    triggerWords: "bmxian_character",
    defaultWeight: "0.72"
  });
  const [error, setError] = useState("");
  const [loraError, setLoraError] = useState("");

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    setError("");
    try {
      await uploadMaterial(file, tags.split(",").map((tag) => tag.trim()).filter(Boolean));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "素材上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleLoraFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || uploadingLora) return;

    setUploadingLora(true);
    setLoraError("");
    try {
      await uploadLoraAsset(file, {
        name: file.name.replace(/\.(safetensors|ckpt|pt|bin)$/i, ""),
        kind: loraMeta.kind === "风格" || loraMeta.kind === "商品" || loraMeta.kind === "通用" ? loraMeta.kind : "角色",
        baseModel: loraMeta.baseModel,
        triggerWords: loraMeta.triggerWords.split(",").map((tag) => tag.trim()).filter(Boolean),
        defaultWeight: Number(loraMeta.defaultWeight) || 0.72
      });
    } catch (uploadError) {
      setLoraError(uploadError instanceof Error ? uploadError.message : "LoRA 上传失败");
    } finally {
      setUploadingLora(false);
    }
  }

  return (
    <div className="content-grid">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Material library</span>
            <h2>素材库</h2>
          </div>
          <label className="primary-compact upload-control">
            <Upload size={16} />
            {uploading ? "上传中" : "上传素材"}
            <input
              type="file"
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <div className="material-toolbar">
          <label>
            <span>标签</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          {error && <p>{error}</p>}
        </div>
        <div className="material-grid">
          {materials.map((material) => (
            <article className="material-card" key={material.id}>
              <a className="material-preview" href={material.url} target="_blank" rel="noreferrer">
                {material.kind === "图片" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={material.url} alt={material.name} />
                ) : (
                  <FileStack size={26} />
                )}
              </a>
              <div className="material-card-body">
                <div>
                  <span>{material.kind}</span>
                  <strong>{formatBytes(material.size)}</strong>
                </div>
                <h3>{material.name}</h3>
                <div className="tag-list">
                  {material.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <footer>
                  <small>{new Date(material.createdAt).toLocaleDateString("zh-CN")}</small>
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    aria-label={`删除素材 ${material.name}`}
                    onClick={() => {
                      void deleteMaterial(material.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">LoRA library</span>
            <h2>LoRA 资产</h2>
          </div>
          <label className="primary-compact upload-control">
            <Upload size={16} />
            {uploadingLora ? "上传中" : "上传 LoRA"}
            <input
              type="file"
              accept=".safetensors,.ckpt,.pt,.bin"
              onChange={(event) => {
                void handleLoraFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <div className="material-toolbar lora-toolbar">
          <label>
            <span>类型</span>
            <select value={loraMeta.kind} onChange={(event) => setLoraMeta((current) => ({ ...current, kind: event.target.value }))}>
              <option value="角色">角色</option>
              <option value="风格">风格</option>
              <option value="商品">商品</option>
              <option value="通用">通用</option>
            </select>
          </label>
          <label>
            <span>基础模型</span>
            <input value={loraMeta.baseModel} onChange={(event) => setLoraMeta((current) => ({ ...current, baseModel: event.target.value }))} />
          </label>
          <label>
            <span>触发词</span>
            <input value={loraMeta.triggerWords} onChange={(event) => setLoraMeta((current) => ({ ...current, triggerWords: event.target.value }))} />
          </label>
          <label>
            <span>默认权重</span>
            <input type="number" min="0" max="1.5" step="0.01" value={loraMeta.defaultWeight} onChange={(event) => setLoraMeta((current) => ({ ...current, defaultWeight: event.target.value }))} />
          </label>
          {loraError && <p>{loraError}</p>}
        </div>
        <div className="material-grid lora-grid">
          {loraAssets.map((asset) => (
            <article className="material-card lora-card" key={asset.id}>
              <a className="material-preview lora-preview" href={asset.url} target="_blank" rel="noreferrer">
                <Layers3 size={28} />
              </a>
              <div className="material-card-body">
                <div>
                  <span>{asset.kind}</span>
                  <strong>{asset.size > 0 ? formatBytes(asset.size) : "内置"}</strong>
                </div>
                <h3>{asset.name}</h3>
                <div className="tag-list">
                  <span>{asset.baseModel}</span>
                  {asset.triggerWords.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <footer>
                  <small>{asset.defaultWeight}</small>
                  {asset.url.startsWith("/uploads/loras/") && (
                    <button
                      className="icon-button danger-icon"
                      type="button"
                      aria-label={`删除 LoRA ${asset.name}`}
                      onClick={() => {
                        void deleteLoraAsset(asset.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
