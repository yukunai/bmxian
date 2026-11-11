import { NextResponse } from "next/server";
import { mergeUsageEvents, usageSummary } from "@/lib/billing";
import { getWorkspaceForClient } from "@/lib/server/store";

function monthlyBudgetCents() {
  const configured = Number(process.env.BMXIAN_MONTHLY_BUDGET_CENTS);
  return Number.isFinite(configured) && configured > 0 ? Math.round(configured) : 10_000;
}

export async function GET() {
  const workspace = await getWorkspaceForClient();
  const events = mergeUsageEvents(workspace.usageEvents, workspace.tasks);

  return NextResponse.json({
    summary: usageSummary(events, monthlyBudgetCents()),
    events
  });
}
