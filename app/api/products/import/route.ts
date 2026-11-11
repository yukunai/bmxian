import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { productProfileSchema } from "@/lib/server/schemas";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { upsertProducts } from "@/lib/server/store";
import type { ProductProfile } from "@/lib/workbench-data";

type RawRecord = Record<string, unknown>;

const aliases = {
  id: ["id", "sku", "sku_id", "商品id", "商品编号", "sku编码", "款号"],
  name: ["name", "title", "商品名称", "商品名", "sku名称", "标题"],
  category: ["category", "类目", "分类", "品类"],
  price: ["price", "售价", "价格", "券后价", "活动价"],
  audience: ["audience", "人群", "目标用户", "目标人群", "用户"],
  stage: ["stage", "阶段", "营销阶段", "活动阶段"],
  platform: ["platform", "平台", "渠道", "店铺平台"],
  tone: ["tone", "语气", "品牌语气", "风格"],
  assets: ["assets", "素材数", "素材数量"],
  notes: ["notes", "卖点", "核心卖点", "sellingpoints", "highlights", "备注"]
} as const;

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "");
}

function valueFrom(record: RawRecord, field: keyof typeof aliases) {
  const aliasSet = new Set(aliases[field].map(normalizeKey));
  const foundKey = Object.keys(record).find((key) => aliasSet.has(normalizeKey(key)));
  return foundKey ? record[foundKey] : undefined;
}

function textValue(record: RawRecord, field: keyof typeof aliases, fallback: string) {
  const value = valueFrom(record, field);
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function notesValue(record: RawRecord) {
  const value = valueFrom(record, "notes");

  if (Array.isArray(value)) {
    const notes = value.map((item) => String(item).trim()).filter(Boolean);
    return notes.length > 0 ? notes : ["待补充卖点"];
  }

  const text = value === undefined || value === null ? "" : String(value);
  const notes = text.split(/[|;；、\n]+/).map((item) => item.trim()).filter(Boolean);
  return notes.length > 0 ? notes : ["待补充卖点"];
}

function assetsValue(record: RawRecord) {
  const value = valueFrom(record, "assets");
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeProduct(record: RawRecord, index: number): ProductProfile {
  return {
    id: textValue(record, "id", `import-${randomUUID().slice(0, 8)}`),
    name: textValue(record, "name", `未命名商品 ${index + 1}`),
    category: textValue(record, "category", "待分类"),
    price: textValue(record, "price", "待填写"),
    audience: textValue(record, "audience", "待补充目标用户"),
    stage: textValue(record, "stage", "导入待整理"),
    platform: textValue(record, "platform", "待选择平台"),
    tone: textValue(record, "tone", "清晰、可信"),
    assets: assetsValue(record),
    notes: notesValue(record)
  };
}

function parseCsvRows(input: string) {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  function pushField() {
    row.push(field.trim());
    field = "";
  }

  function pushRow() {
    pushField();
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === "\"" && text[index + 1] === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      pushRow();
    } else {
      field += char;
    }
  }

  pushRow();
  return rows;
}

function recordsFromCsv(text: string) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSV 至少需要表头和一行商品数据。");

  const headers = rows[0];
  return rows.slice(1).map((row) =>
    headers.reduce<RawRecord>((record, header, index) => {
      record[header] = row[index] ?? "";
      return record;
    }, {})
  );
}

async function recordsFromRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      throw new Error("请上传 CSV 或 JSON 文件。");
    }

    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    const text = await file.text();

    if (fileName.endsWith(".json") || fileType.includes("json")) {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed as RawRecord[];
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { products?: unknown }).products)) {
        return (parsed as { products: RawRecord[] }).products;
      }
      throw new Error("JSON 需要是商品数组，或包含 products 数组。");
    }

    return recordsFromCsv(text);
  }

  const parsed = await request.json();
  if (Array.isArray(parsed)) return parsed as RawRecord[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { products?: unknown }).products)) {
    return (parsed as { products: RawRecord[] }).products;
  }

  throw new Error("请求体需要是商品数组，或包含 products 数组。");
}

export async function POST(request: Request) {
  try {
    const guard = await requireWorkspaceRole("editor");
    if (!guard.ok) return guard.response;

    const records = await recordsFromRequest(request);
    if (records.length === 0) {
      return NextResponse.json({ error: "没有可导入的商品数据。" }, { status: 400 });
    }

    const products = records.map((record, index) => normalizeProduct(record, index));
    const validProducts: ProductProfile[] = [];

    for (const product of products) {
      const parsedProduct = productProfileSchema.safeParse(product);
      if (!parsedProduct.success) {
        return NextResponse.json({ error: parsedProduct.error.flatten() }, { status: 400 });
      }
      validProducts.push(parsedProduct.data);
    }

    const dedupedProducts = Array.from(
      new Map(validProducts.map((product) => [product.id, product])).values()
    );
    const workspace = await upsertProducts(dedupedProducts);

    return NextResponse.json(
      {
        imported: dedupedProducts.length,
        importedProducts: dedupedProducts,
        products: workspace.products
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "商品导入失败。" },
      { status: 400 }
    );
  }
}
