"use server";
/**
 * Billing Day actions: run billing, send reminders.
 */
import { requireStaff } from "@/server/auth/access";
import { runBilling, type BillingResult } from "@/server/services/billing";
import { sendReminders } from "@/server/services/reminders";
import { revalidatePath } from "next/cache";

export async function runBillingAction(asOf: string, send: boolean): Promise<{ ok: true; result: Omit<BillingResult, "invoiceIds"> } | { ok: false; error: string }> {
  const user = await requireStaff();
  try {
    const r = await runBilling(asOf, { actorId: user.id, send });
    for (const path of ["/billing", "/invoices", "/subscriptions", "/dashboard"]) revalidatePath(path);
    return { ok: true, result: { asOf: r.asOf, created: r.created, skipped: r.skipped, amount: r.amount, closed: r.closed, emailed: r.emailed } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Billing failed" };
  }
}

export async function sendRemindersAction() {
  await requireStaff();
  const result = await sendReminders();
  revalidatePath("/billing");
  revalidatePath("/settings/emails");
  return result;
}
