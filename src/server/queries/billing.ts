/**
 * Billing Day preview: what a run would create, and which reminders are due. Read-only.
 */
import "server-only";
import { requireStaff } from "@/server/auth/access";
import { planBilling } from "@/server/services/billing";
import { planReminders } from "@/server/services/reminders";
import { today } from "@/lib/dates";

/** `asOf` defaults to today (resolved after the access check, so it's per request). */
export async function getBillingPreview(asOfInput: string | null) {
  await requireStaff();
  const asOf = asOfInput ?? today();
  const [plan, reminders] = await Promise.all([planBilling(asOf), planReminders(today())]);
  return {
    asOf,
    today: today(),
    totals: plan.totals,
    skipped: plan.skipped.length,
    // Only what the page shows; pricing detail stays on the server.
    rows: plan.invoices.map((i) => ({
      key: `${i.subscriptionId}|${i.periodStart}`,
      subscriptionId: i.subscriptionId,
      subscriptionNumber: i.subscriptionNumber,
      customerName: i.customerName,
      planName: i.planName,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
      total: i.pricing.total,
      discount: i.pricing.discountTotal,
      flags: i.flags,
    })),
    reminders: {
      overdue: reminders.filter((r) => r.type === "overdue").length,
      renewals: reminders.filter((r) => r.type === "renewal").length,
    },
  };
}
export type BillingPreview = Awaited<ReturnType<typeof getBillingPreview>>;
