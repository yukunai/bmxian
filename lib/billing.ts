import type { GenerationTask, SupplierInvoice, UsageEvent } from "@/lib/workbench-data";

export function taskCostCents(cost: string) {
  const match = cost.match(/([0-9]+(?:\.[0-9]+)?)\s*元/);
  if (!match) return 0;
  return Math.round(Number(match[1]) * 100);
}

export function formatCny(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function usageEventForTask(task: GenerationTask): UsageEvent | undefined {
  const amountCents = taskCostCents(task.cost);
  if (amountCents <= 0) return undefined;

  return {
    id: `usage-${task.id}`,
    taskId: task.id,
    mode: task.type,
    model: task.model,
    providerId: task.providerId,
    providerLabel: task.providerLabel,
    amountCents,
    currency: "CNY",
    status: task.status === "已完成" ? "final" : "estimated",
    createdAt: task.updatedAt ?? task.createdAt ?? "2026-01-01T00:00:00.000Z"
  };
}

export function mergeUsageEvents(existing: UsageEvent[], tasks: GenerationTask[]) {
  const merged = new Map(existing.map((event) => [event.id, event]));

  for (const task of tasks) {
    const event = usageEventForTask(task);
    if (!event) continue;
    const previous = merged.get(event.id);
    merged.set(event.id, {
      ...previous,
      ...event,
      status: previous?.status === "final" ? "final" : event.status
    });
  }

  return Array.from(merged.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function usageSummary(events: UsageEvent[], budgetCents = 10_000) {
  const billableEvents = events.filter((event) => event.status !== "refunded");
  const spentCents = billableEvents.reduce((total, event) => total + event.amountCents, 0);
  const percent = budgetCents > 0 ? Math.min(100, Math.round((spentCents / budgetCents) * 100)) : 0;
  const providerCounts = billableEvents.reduce<Record<string, number>>((counts, event) => {
    const key = event.providerLabel ?? event.model;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "暂无";

  return {
    budgetCents,
    spentCents,
    percent,
    spentLabel: formatCny(spentCents),
    budgetLabel: formatCny(budgetCents),
    eventCount: billableEvents.length,
    topProvider
  };
}

export type BillingInvoiceLine = {
  providerId?: string;
  providerLabel: string;
  model: string;
  eventCount: number;
  estimatedCount: number;
  finalCount: number;
  refundedCount: number;
  estimatedCents: number;
  finalCents: number;
  refundedCents: number;
  amountCents: number;
  amountLabel: string;
};

export type BillingInvoice = {
  id: string;
  period: string;
  currency: "CNY";
  status: "draft" | "ready_for_payment";
  issuedAt: string;
  totals: {
    budgetCents: number;
    subtotalCents: number;
    refundedCents: number;
    totalCents: number;
    remainingBudgetCents: number;
    subtotalLabel: string;
    totalLabel: string;
    remainingBudgetLabel: string;
  };
  payment: {
    provider: string;
    status: "not_configured" | "manual" | "ready";
  };
  lines: BillingInvoiceLine[];
  supplierReconciliation: Array<{
    providerId?: string;
    providerLabel: string;
    eventCount: number;
    finalCents: number;
    estimatedCents: number;
    refundedCents: number;
    needsReview: boolean;
  }>;
};

export function currentBillingPeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function eventPeriod(event: UsageEvent) {
  return event.createdAt.slice(0, 7);
}

function invoiceLineKey(event: UsageEvent) {
  return `${event.providerId ?? "provider"}::${event.providerLabel ?? event.model}::${event.model}`;
}

export function billingInvoice(
  events: UsageEvent[],
  budgetCents = 10_000,
  period = currentBillingPeriod(),
  paymentProvider = "manual"
): BillingInvoice {
  const periodEvents = events.filter((event) => eventPeriod(event) === period);
  const linesByKey = new Map<string, BillingInvoiceLine>();

  for (const event of periodEvents) {
    const key = invoiceLineKey(event);
    const previous = linesByKey.get(key);
    const amount = event.status === "refunded" ? 0 : event.amountCents;
    const estimatedCents = event.status === "estimated" ? event.amountCents : 0;
    const finalCents = event.status === "final" ? event.amountCents : 0;
    const refundedCents = event.status === "refunded" ? event.amountCents : 0;

    linesByKey.set(key, {
      providerId: event.providerId,
      providerLabel: event.providerLabel ?? event.model,
      model: event.model,
      eventCount: (previous?.eventCount ?? 0) + 1,
      estimatedCount: (previous?.estimatedCount ?? 0) + (event.status === "estimated" ? 1 : 0),
      finalCount: (previous?.finalCount ?? 0) + (event.status === "final" ? 1 : 0),
      refundedCount: (previous?.refundedCount ?? 0) + (event.status === "refunded" ? 1 : 0),
      estimatedCents: (previous?.estimatedCents ?? 0) + estimatedCents,
      finalCents: (previous?.finalCents ?? 0) + finalCents,
      refundedCents: (previous?.refundedCents ?? 0) + refundedCents,
      amountCents: (previous?.amountCents ?? 0) + amount,
      amountLabel: formatCny((previous?.amountCents ?? 0) + amount)
    });
  }

  const lines = Array.from(linesByKey.values()).sort((a, b) => b.amountCents - a.amountCents);
  const refundedCents = periodEvents
    .filter((event) => event.status === "refunded")
    .reduce((total, event) => total + event.amountCents, 0);
  const subtotalCents = lines.reduce((total, line) => total + line.amountCents, 0);
  const totalCents = Math.max(0, subtotalCents);
  const provider = paymentProvider.trim() || "manual";

  return {
    id: `bmxian-invoice-${period}`,
    period,
    currency: "CNY",
    status: provider === "manual" ? "draft" : "ready_for_payment",
    issuedAt: new Date().toISOString(),
    totals: {
      budgetCents,
      subtotalCents,
      refundedCents,
      totalCents,
      remainingBudgetCents: Math.max(0, budgetCents - totalCents),
      subtotalLabel: formatCny(subtotalCents),
      totalLabel: formatCny(totalCents),
      remainingBudgetLabel: formatCny(Math.max(0, budgetCents - totalCents))
    },
    payment: {
      provider,
      status: provider === "manual" ? "not_configured" : "ready"
    },
    lines,
    supplierReconciliation: lines.map((line) => ({
      providerId: line.providerId,
      providerLabel: line.providerLabel,
      eventCount: line.eventCount,
      finalCents: line.finalCents,
      estimatedCents: line.estimatedCents,
      refundedCents: line.refundedCents,
      needsReview: line.estimatedCount > 0 || line.refundedCount > 0
    }))
  };
}

export function reconcileSupplierInvoices(invoice: BillingInvoice, supplierInvoices: SupplierInvoice[]) {
  const supplierByProvider = new Map<string, SupplierInvoice[]>();
  for (const supplierInvoice of supplierInvoices.filter((item) => item.period === invoice.period)) {
    const key = supplierInvoice.providerId ?? supplierInvoice.providerLabel;
    supplierByProvider.set(key, [...(supplierByProvider.get(key) ?? []), supplierInvoice]);
  }

  const internalKeys = new Set(invoice.supplierReconciliation.map((line) => line.providerId ?? line.providerLabel));
  const allKeys = new Set([...internalKeys, ...supplierByProvider.keys()]);

  return Array.from(allKeys).map((key) => {
    const internal = invoice.supplierReconciliation.find((line) => (line.providerId ?? line.providerLabel) === key);
    const suppliers = supplierByProvider.get(key) ?? [];
    const supplierCents = suppliers.reduce((total, item) => total + item.amountCents, 0);
    const internalCents = internal?.finalCents ?? 0;
    const deltaCents = supplierCents - internalCents;
    const providerLabel = internal?.providerLabel ?? suppliers[0]?.providerLabel ?? key;
    const status = suppliers.length === 0
      ? "missing_supplier"
      : internalCents === 0
        ? "missing_internal"
        : Math.abs(deltaCents) <= 1 && !internal?.needsReview
          ? "matched"
          : "needs_review";

    return {
      providerId: internal?.providerId ?? suppliers[0]?.providerId,
      providerLabel,
      period: invoice.period,
      internalCents,
      supplierCents,
      deltaCents,
      internalLabel: formatCny(internalCents),
      supplierLabel: formatCny(supplierCents),
      deltaLabel: formatCny(deltaCents),
      importedInvoices: suppliers.length,
      status
    };
  }).sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents));
}
