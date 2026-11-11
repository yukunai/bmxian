"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, ChevronRight, FileStack, Plus, Trash2, Upload } from "lucide-react";
import type { ProductProfile } from "@/lib/workbench-data";
import { cx, nextId } from "../shared";
import { useWorkbench } from "../store";

export function ProductsView() {
  const { products, selectedProductId, setSelectedProductId, setActiveNav, updateProduct, importProducts, createCampaignPack, deleteProduct } = useWorkbench();
  const activeProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<string | null>(null);
  const [campaignBusy, setCampaignBusy] = useState(false);

  function patchProduct(patch: Partial<ProductProfile>) {
    void updateProduct({ ...activeProduct, ...patch });
  }

  function patchNote(index: number, value: string) {
    patchProduct({
      notes: activeProduct.notes.map((note, noteIndex) => (noteIndex === index ? value : note))
    });
  }

  function addNote() {
    patchProduct({ notes: [...activeProduct.notes, "新卖点"] });
  }

  async function handleProductImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);

    try {
      const result = await importProducts(file);
      setImportStatus(`已导入 ${result.imported} 个商品`);
    } catch (error) {
      setImportStatus(`导入失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      input.value = "";
      setImporting(false);
    }
  }

  async function handleCampaignPack() {
    if (campaignBusy) return;

    setCampaignBusy(true);
    setCampaignStatus(null);

    try {
      const result = await createCampaignPack(activeProduct);
      setCampaignStatus(`已生成 ${result.artifacts.length} 条内容资产，已进入作品集`);
    } catch (error) {
      setCampaignStatus(`生成失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setCampaignBusy(false);
    }
  }

  return (
    <div className="content-grid two">
      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Product archive</span>
            <h2>商品档案</h2>
          </div>
          <div className="button-row product-actions">
            <label className={cx("ghost-button", "upload-control", "product-import", importing && "disabled-control")}>
              <Upload size={16} />
              {importing ? "导入中" : "导入 SKU"}
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                aria-label="导入 SKU 文件"
                disabled={importing}
                onChange={handleProductImport}
              />
            </label>
            <button
              className="primary-compact"
              type="button"
              onClick={() => {
                const product: ProductProfile = {
                  id: nextId("product"),
                  name: "未命名商品",
                  category: "待填写",
                  price: "待填写",
                  audience: "待填写目标人群",
                  stage: "草稿",
                  platform: "待选择平台",
                  tone: "待定义",
                  assets: 0,
                  notes: ["新卖点"]
                };
                void updateProduct(product);
                setSelectedProductId(product.id);
              }}
            >
              <Plus size={16} />
              新档案
            </button>
          </div>
        </div>
        {importStatus && (
          <p className={cx("import-status", importStatus.startsWith("导入失败") && "error")}>
            {importStatus}
          </p>
        )}
        <div className="product-table">
          {products.map((product) => (
            <button
              className={cx("product-row", selectedProductId === product.id && "active")}
              key={product.id}
              type="button"
              onClick={() => setSelectedProductId(product.id)}
            >
              <span>
                <strong>{product.name}</strong>
                <small>{product.category}</small>
              </span>
              <span>{product.platform}</span>
              <span>{product.assets} 个素材</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="data-panel detail">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Selected product</span>
            <h2>{activeProduct.name}</h2>
          </div>
          <div className="button-row">
            <button
              className="primary-compact"
              type="button"
              disabled={campaignBusy}
              onClick={() => {
                void handleCampaignPack();
              }}
            >
              <FileStack size={15} />
              {campaignBusy ? "生成中" : "生成内容包"}
            </button>
            <button className="ghost-button" type="button" onClick={() => setActiveNav("studio")}>
              去创作
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={() => {
                void deleteProduct(activeProduct.id);
              }}
            >
              <Trash2 size={15} />
              删除
            </button>
          </div>
        </div>
        {campaignStatus && (
          <p className={cx("import-status", campaignStatus.startsWith("生成失败") && "error")}>
            {campaignStatus}
          </p>
        )}
        <div className="edit-form">
          <label>
            <span>商品名称</span>
            <input value={activeProduct.name} onChange={(event) => patchProduct({ name: event.target.value })} />
          </label>
          <label>
            <span>类目</span>
            <input value={activeProduct.category} onChange={(event) => patchProduct({ category: event.target.value })} />
          </label>
          <label>
            <span>价格</span>
            <input value={activeProduct.price} onChange={(event) => patchProduct({ price: event.target.value })} />
          </label>
          <label>
            <span>目标用户</span>
            <input value={activeProduct.audience} onChange={(event) => patchProduct({ audience: event.target.value })} />
          </label>
          <label>
            <span>平台</span>
            <input value={activeProduct.platform} onChange={(event) => patchProduct({ platform: event.target.value })} />
          </label>
          <label>
            <span>品牌语气</span>
            <input value={activeProduct.tone} onChange={(event) => patchProduct({ tone: event.target.value })} />
          </label>
          <label>
            <span>阶段</span>
            <input value={activeProduct.stage} onChange={(event) => patchProduct({ stage: event.target.value })} />
          </label>
        </div>
        <div className="structured-box">
          <div className="section-title-row">
            <h3>卖点结构</h3>
            <button className="ghost-button" type="button" onClick={addNote}>添加卖点</button>
          </div>
          {activeProduct.notes.map((note, index) => (
            <p key={`${activeProduct.id}-${index}`}>
              <CheckCircle2 size={15} />
              <input value={note} onChange={(event) => patchNote(index, event.target.value)} />
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
