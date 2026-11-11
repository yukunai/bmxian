import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { billingInvoice, currentBillingPeriod, mergeUsageEvents, reconcileSupplierInvoices } from "@/lib/billing";
import { deleteByIdSchema } from "@/lib/server/schemas";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { deleteSupplierInvoice, getWorkspaceForClient, upsertSupplierInvoices } from "@/lib/server/store";
import type { SupplierInvoice } from "@/lib/workbench-data";

type RawRecord = Record<string, unknown>;

const supplierInvoiceInputSchema = z.object({
  id: z.string().optional(),
  providerId: z.string().optional(),
  providerLabel: z.string().min(1),
  period: z.string().optional(),
  amountCents: z.number().optional(),
  amountYuan: z.number().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  externalInvoiceId: z.string().optional(),
  lineCount: z.number().optional(),
  notes: z.array(z.string()).optional()
});

const supplierInvoiceImportSchema = z.object({
  invoices: z.array(supplierInvoiceInputSchema).optional(),
  csv: z.string().optional(),
  period: z.string().optional()
}).refine((data) => data.invoices?.length || data.csv?.trim(), {
  message: "invoices or csv is required",
  path: ["invoices"]
});

const aliases = {
  providerId: ["providerId", "provider_id", "供应商id", "供应商编号"],
  providerLabel: ["providerLabel", "provider", "provider_name", "供应商", "供应商名称"],
  period: ["period", "账期", "月份", "billing_period"],
  amountCents: ["amountCents", "amount_cents", "分"],
  amountYuan: ["amountYuan", "amount_yuan", "amount", "金额", "人民币", "元"],
  externalInvoiceId: ["externalInvoiceId", "invoice_id", "账单号", "发票号"],
  lineCount: ["lineCount", "line_count", "行数", "明细数"],
  notes: ["notes", "备注", "说明"]
} as const;

function monthlyBudgetCents() {
  const configured = Number(process.env.BMXIAN_MONTHLY_BUDGET_CENTS);
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 10_000;
}

function paymentProvider() {
  return process.env.BMXIAN_PAYMENT_PROVIDER?.trim() || "manual";
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "");
}

function valueFrom(record: RawRecord, field: keyof typeof aliases) {
  const aliasSet = new Set(aliases[field].map(normalizeKey));
  const foundKey = Object.keys(record).find((key) => aliasSet.has(normalizeKey(key)));
  return foundKey ? record[foundKey] : undefined;
}

function textValue(record: RawRecord, field: keyof typeof aliases, fallback = "") {
  const value = valueFrom(record, field);
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || fallback;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").replace(/[¥￥,\s]/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function amountCents(input: z.infer<typeof supplierInvoiceInputSchema>) {
  if (typeof input.amountCents === "number" && Number.isFinite(input.amountCents)) {
    return Math.round(input.amountCents);
  }
  if (typeof input.amountYuan === "number" && Number.isFinite(input.amountYuan)) {
    return Math.round(input.amountYuan * 100);
  }
  return Math.round(numberValue(input.amount) * 100);
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

    if (char === "\"") inQuotes = true;
    else if (char === ",") pushField();
    else if (char === "\n") pushRow();
    else if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      pushRow();
    } else field += char;
  }

  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

function parseCsvInvoices(csv: string, fallbackPeriod: string) {
  const rows = parseCsvRows(csv);
  const [headers, ...bodyRows] = rows;
  if (!headers?.length) return [];

  return bodyRows.map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    return {
      providerId: textValue(record, "providerId") || undefined,
      providerLabel: textValue(record, "providerLabel", "未知供应商"),
      period: textValue(record, "period", fallbackPeriod),
      amountCents: numberValue(valueFrom(record, "amountCents")) || undefined,
      amountYuan: numberValue(valueFrom(record, "amountYuan")) || undefined,
      externalInvoiceId: textValue(record, "externalInvoiceId") || undefined,
      lineCount: Math.max(1, Math.round(numberValue(valueFrom(record, "lineCount")) || 1)),
      notes: textValue(record, "notes") ? [textValue(record, "notes")] : []
    };
  });
}

function normalizeInvoice(
  input: z.infer<typeof supplierInvoiceInputSchema>,
  source: SupplierInvoice["source"],
  fallbackPeriod: string
): SupplierInvoice {
  const now = new Date().toISOString();
  const totalCents = amountCents(input);

  return {
    id: input.id ?? `supplier-invoice-${randomUUID().slice(0, 8)}`,
    providerId: input.providerId,
    providerLabel: input.providerLabel,
    period: input.period ?? fallbackPeriod,
    amountCents: totalCents,
    currency: "CNY",
    externalInvoiceId: input.externalInvoiceId,
    source,
    lineCount: Math.max(1, Math.round(input.lineCount ?? 1)),
    notes: input.notes ?? [],
    importedAt: now
  };
}

async function billingSnapshot(period: string) {
  const workspace = await getWorkspaceForClient();
  const events = mergeUsageEvents(workspace.usageEvents, workspace.tasks);
  const invoice = billingInvoice(events, monthlyBudgetCents(), period, paymentProvider());
  const supplierInvoices = workspace.supplierInvoices.filter((item) => item.period === period);

  return {
    invoice,
    supplierInvoices,
    reconciliation: reconcileSupplierInvoices(invoice, supplierInvoices)
  };
}

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period")?.trim() || currentBillingPeriod();
  return NextResponse.json(await billingSnapshot(period));
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = supplierInvoiceImportSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const fallbackPeriod = parsed.data.period ?? currentBillingPeriod();
  const invoiceInputs = [
    ...(parsed.data.invoices ?? []),
    ...(parsed.data.csv ? parseCsvInvoices(parsed.data.csv, fallbackPeriod) : [])
  ];
  const invoices = invoiceInputs.map((invoice) =>
    normalizeInvoice(invoice, parsed.data.csv ? "csv" : "json", fallbackPeriod)
  );
  const workspace = await upsertSupplierInvoices(invoices);
  const snapshot = await billingSnapshot(fallbackPeriod);

  return NextResponse.json({
    imported: invoices.length,
    supplierInvoices: workspace.supplierInvoices.filter((item) => item.period === fallbackPeriod),
    reconciliation: snapshot.reconciliation
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = deleteByIdSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await deleteSupplierInvoice(parsed.data.id);
  return NextResponse.json({ supplierInvoices: workspace.supplierInvoices });
}
