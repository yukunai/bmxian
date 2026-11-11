import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { billingInvoice, currentBillingPeriod, mergeUsageEvents, usageSummary } from "@/lib/billing";
import { requireWorkspaceRole } from "@/lib/server/rbac";
import { getWorkspaceForClient, updatePaymentSessionStatus, upsertPaymentSession } from "@/lib/server/store";
import type { PaymentSession } from "@/lib/workbench-data";

const createCheckoutSchema = z.object({
  period: z.string().optional(),
  note: z.string().optional()
});

const updateCheckoutSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "paid", "cancelled"]),
  note: z.string().optional()
});

function monthlyBudgetCents() {
  const configured = Number(process.env.BMXIAN_MONTHLY_BUDGET_CENTS);
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 10_000;
}

function paymentProvider() {
  return process.env.BMXIAN_PAYMENT_PROVIDER?.trim() || "manual";
}

function checkoutUrlFor(sessionId: string) {
  const configuredBase = process.env.BMXIAN_CHECKOUT_BASE_URL?.trim();
  if (configuredBase) {
    try {
      const url = new URL(configuredBase);
      url.searchParams.set("session_id", sessionId);
      return url.toString();
    } catch {
      return configuredBase;
    }
  }

  return `/api/billing/checkout?sessionId=${encodeURIComponent(sessionId)}`;
}

async function checkoutSnapshot(period: string, sessionId?: string) {
  const workspace = await getWorkspaceForClient();
  const events = mergeUsageEvents(workspace.usageEvents, workspace.tasks);
  const invoice = billingInvoice(events, monthlyBudgetCents(), period, paymentProvider());
  const paymentSessions = workspace.paymentSessions.filter((session) => session.period === period);
  const selectedSession = sessionId
    ? workspace.paymentSessions.find((session) => session.id === sessionId)
    : undefined;

  return {
    invoice,
    paymentSessions,
    session: selectedSession,
    summary: usageSummary(events, monthlyBudgetCents())
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period")?.trim() || currentBillingPeriod();
  const sessionId = url.searchParams.get("sessionId")?.trim();
  const snapshot = await checkoutSnapshot(period, sessionId);
  if (sessionId && !snapshot.session) return NextResponse.json({ error: "payment session not found" }, { status: 404 });
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = createCheckoutSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const period = parsed.data.period?.trim() || currentBillingPeriod();
  const workspace = await getWorkspaceForClient();
  const events = mergeUsageEvents(workspace.usageEvents, workspace.tasks);
  const invoice = billingInvoice(events, monthlyBudgetCents(), period, paymentProvider());
  const now = new Date().toISOString();
  const sessionId = `pay-${randomUUID().slice(0, 8)}`;
  const session: PaymentSession = {
    id: sessionId,
    invoiceId: invoice.id,
    period,
    amountCents: invoice.totals.totalCents,
    currency: invoice.currency,
    provider: invoice.payment.provider,
    status: "pending",
    checkoutUrl: checkoutUrlFor(sessionId),
    createdAt: now,
    updatedAt: now,
    note: parsed.data.note?.trim() || undefined
  };

  const nextWorkspace = await upsertPaymentSession(session);
  return NextResponse.json({
    session,
    paymentSessions: nextWorkspace.paymentSessions.filter((item) => item.period === period),
    invoice
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const guard = await requireWorkspaceRole("admin");
  if (!guard.ok) return guard.response;

  const parsed = updateCheckoutSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await getWorkspaceForClient();
  const existing = workspace.paymentSessions.find((session) => session.id === parsed.data.id);
  if (!existing) return NextResponse.json({ error: "payment session not found" }, { status: 404 });

  const nextWorkspace = await updatePaymentSessionStatus(parsed.data.id, parsed.data.status, parsed.data.note);
  const session = nextWorkspace.paymentSessions.find((item) => item.id === parsed.data.id);

  return NextResponse.json({
    session,
    paymentSessions: nextWorkspace.paymentSessions.filter((item) => item.period === existing.period)
  });
}
