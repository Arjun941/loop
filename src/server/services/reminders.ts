/**
 * Follow-up emails that chase money and renewals without anyone remembering to.
 *
 * - Overdue invoices get a reminder at 1, 7 and 14 days past due, each firmer than the last.
 *   Only invoices that fell overdue in the last 30 days are chased automatically; older ones need a person.
 * - Active subscriptions get a renewal reminder 14 days before they expire.
 *
 * Each stage is sent at most once: the `reminders` table has a unique row per invoice (or subscription)
 * and stage, and a row is claimed before the email goes out.
 */
import "server-only";
import { addDays, today } from "@/lib/dates";
import { daysOverdue } from "@/lib/domain/invoice-status";
import { formatDate, money } from "@/lib/format";
import { db } from "@/server/db";
import { companySettings, customers, invoices, plans, reminders, subscriptions } from "@/server/db/schema";
import { sendEmail } from "@/server/email/send";
import { OverdueReminderEmail, RenewalReminderEmail, type OverdueStage } from "@/server/email/templates/invoice";
import { appUrl } from "@/server/env";
import { and, eq, gt, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { createElement } from "react";

const STAGES: { days: number; kind: "overdue_1" | "overdue_7" | "overdue_14"; stage: OverdueStage }[] = [
  { days: 14, kind: "overdue_14", stage: 3 },
  { days: 7, kind: "overdue_7", stage: 2 },
  { days: 1, kind: "overdue_1", stage: 1 },
];
const CHASE_WINDOW_DAYS = 30;
const RENEWAL_LEAD_DAYS = 14;

export type PlannedReminder =
  | { type: "overdue"; kind: (typeof STAGES)[number]["kind"]; stage: OverdueStage; invoiceId: string; number: string; customerId: string; customerName: string; email: string; balance: number; dueDate: string }
  | { type: "renewal"; kind: "renewal_14"; subscriptionId: string; number: string; customerId: string; customerName: string; email: string; planName: string; expiryDate: string };

/** What reminders are due on `asOf`. Writes nothing. */
export async function planReminders(asOf = today()): Promise<PlannedReminder[]> {
  const [settings] = await db.select({ enabled: companySettings.remindersEnabled }).from(companySettings);
  if (settings && !settings.enabled) return [];

  const sent = sql<string[]>`coalesce((select array_agg(${reminders.kind}::text) from ${reminders} where ${reminders.invoiceId} = ${invoices.id}), '{}')`;
  const overdueRows = await db
    .select({ inv: invoices, customer: customers, sent })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(
      and(
        eq(invoices.status, "confirmed"),
        gt(invoices.total, invoices.amountPaid),
        lt(invoices.dueDate, asOf),
        gte(invoices.dueDate, addDays(asOf, -CHASE_WINDOW_DAYS)),
        eq(customers.remindersEnabled, true),
      ),
    );

  const planned: PlannedReminder[] = [];
  for (const { inv, customer, sent: already } of overdueRows) {
    const days = daysOverdue(inv.dueDate, asOf);
    // Only the latest stage reached; earlier stages that were missed aren't sent late.
    const stage = STAGES.find((s) => days >= s.days);
    if (!stage || already.includes(stage.kind)) continue;
    planned.push({
      type: "overdue",
      kind: stage.kind,
      stage: stage.stage,
      invoiceId: inv.id,
      number: inv.number,
      customerId: customer.id,
      customerName: customer.name,
      email: customer.email,
      balance: inv.total - inv.amountPaid,
      dueDate: inv.dueDate,
    });
  }

  const renewals = await db
    .select({ sub: subscriptions, customer: customers, planName: plans.name })
    .from(subscriptions)
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .leftJoin(reminders, and(eq(reminders.subscriptionId, subscriptions.id), eq(reminders.kind, "renewal_14")))
    .where(
      and(
        eq(subscriptions.status, "active"),
        eq(plans.renewable, true),
        gt(subscriptions.expiryDate, asOf),
        lte(subscriptions.expiryDate, addDays(asOf, RENEWAL_LEAD_DAYS)),
        eq(customers.remindersEnabled, true),
        isNull(reminders.id),
      ),
    );
  for (const { sub, customer, planName } of renewals) {
    planned.push({
      type: "renewal",
      kind: "renewal_14",
      subscriptionId: sub.id,
      number: sub.number,
      customerId: customer.id,
      customerName: customer.name,
      email: customer.email,
      planName,
      expiryDate: sub.expiryDate!,
    });
  }
  return planned;
}

/** Sends every reminder due on `asOf`. Returns how many went out. */
export async function sendReminders(asOf = today()) {
  const planned = await planReminders(asOf);
  let sent = 0;
  for (const r of planned) {
    // Claim the stage first, so a parallel run can't send the same reminder twice.
    const [claimed] = await db
      .insert(reminders)
      .values(r.type === "overdue" ? { invoiceId: r.invoiceId, kind: r.kind } : { subscriptionId: r.subscriptionId, kind: r.kind })
      .onConflictDoNothing()
      .returning({ id: reminders.id });
    if (!claimed) continue;

    const element =
      r.type === "overdue"
        ? createElement(OverdueReminderEmail, {
            stage: r.stage,
            customerName: r.customerName,
            number: r.number,
            balance: money(r.balance),
            dueDate: formatDate(r.dueDate),
            portalUrl: appUrl("/portal"),
          })
        : createElement(RenewalReminderEmail, {
            customerName: r.customerName,
            number: r.number,
            planName: r.planName,
            expiryDate: formatDate(r.expiryDate),
            portalUrl: appUrl("/portal"),
          });
    await sendEmail({
      to: r.email,
      subject: r.type === "overdue" ? `Reminder: invoice ${r.number} is overdue` : `Your ${r.planName} subscription ends ${formatDate(r.expiryDate, { short: true })}`,
      template: r.type === "overdue" ? `reminder-${r.kind}` : "renewal-reminder",
      element,
      customerId: r.customerId,
    });
    sent += 1;
  }
  return { planned: planned.length, sent };
}
