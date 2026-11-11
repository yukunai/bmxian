import { NextResponse } from "next/server";
import { billingInvoice, currentBillingPeriod, mergeUsageEvents, reconcileSupplierInvoices, usageSummary } from "@/lib/billing";
import { getWorkspaceForClient } from "@/lib/server/store";

function monthlyBudgetCents() {
  const configured = Number(process.env.BMXIAN_MONTHLY_BUDGET_CENTS);
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 10_000;
}

function paymentProvider() {
  return process.env.BMXIAN_PAYMENT_PROVIDER?.trim() || "manual";
}

export async function GET(request: Request) {
  const workspace = await getWorkspaceForClient();
  const events = mergeUsageEvents(workspace.usageEvents, workspace.tasks);
  const period = new URL(request.url).searchParams.get("period")?.trim() || currentBillingPeriod();
  const budgetCents = monthlyBudgetCents();
  const invoice = billingInvoice(events, budgetCents, period, paymentProvider());
  const supplierInvoices = workspace.supplierInvoices.filter((item) => item.period === period);
  const paymentSessions = workspace.paymentSessions.filter((item) => item.period === period);

  return NextResponse.json({
    invoice,
    paymentSessions,
    supplierInvoices,
    supplierImportReconciliation: reconcileSupplierInvoices(invoice, supplierInvoices),
    summary: usageSummary(events, budgetCents)
  });
}
