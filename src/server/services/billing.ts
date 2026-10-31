/**
 * The billing engine: turns due subscriptions into invoices.
 *
 * `planBilling` is a dry run that writes nothing (Billing Day preview). `runBilling` does the same
 * work for real. Both share one code path, so the preview is exactly what gets created.
 *
 * Guarantees:
 * - Nothing is billed twice: the database rejects a second invoice for the same subscription and
 *   period start (`invoices_sub_period_unique`), and inserts use ON CONFLICT DO NOTHING. Re-running
 *   is always safe and reports what it skipped.
 * - Nothing is skipped: a subscription that missed runs catches up period by period (`duePeriods`).
 * - Discounts apply on their own, and stop when they expire or reach their usage limit, including
 *   part-way through a run.
 */
import "server-only";
import { addDays, today } from "@/lib/dates";
import { duePeriods, invoiceNumber } from "@/lib/domain/billing";
import { priceLines, type DiscountRule, type PriceResult, type PricingLine } from "@/lib/domain/pricing";
import { db } from "@/server/db";
import { customers, discounts, invoiceLines, invoices, plans, subscriptionEvents, subscriptionLines, subscriptions } from "@/server/db/schema";
import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { loadProductTypes, loadTaxes } from "./pricing-context";
import { sendInvoiceEmails } from "./invoices";

export type PlannedInvoice = {
  subscriptionId: string;
  subscriptionNumber: string;
  customerId: string;
  customerName: string;
  planName: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  pricing: PriceResult;
  discountId: string | null;
  flags: Flag[];
};

export type Flag = "catch_up" | "final_invoice" | "auto_close" | "discount_ending" | "discount_stopped";

type SubscriptionChange = {
  subscriptionId: string;
  nextInvoiceDate: string | null;
  close: boolean;
  mrr: number;
};

export type BillingPlan = {
  asOf: string;
  invoices: PlannedInvoice[];
  /** Periods that already have an invoice; listed to show the run is safe to repeat. */
  skipped: { subscriptionNumber: string; customerName: string; periodStart: string }[];
  changes: SubscriptionChange[];
  totals: { count: number; amount: number; customers: number; discounts: number; closing: number };
};

/** Dry run: what billing on `asOf` would create. Writes nothing. */
export async function planBilling(asOf: string): Promise<BillingPlan> {
  const due = await db
    .select({ sub: subscriptions, plan: plans, customerName: customers.name })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .where(and(eq(subscriptions.status, "active"), isNotNull(subscriptions.nextInvoiceDate), lte(subscriptions.nextInvoiceDate, asOf)))
    .orderBy(subscriptions.number);

  const empty: BillingPlan = { asOf, invoices: [], skipped: [], changes: [], totals: { count: 0, amount: 0, customers: 0, discounts: 0, closing: 0 } };
  if (due.length === 0) return empty;

  // Load everything pricing needs in a handful of queries, not several per subscription.
  const ids = due.map((d) => d.sub.id);
  const discountIds = [...new Set(due.flatMap((d) => (d.sub.discountId ? [d.sub.discountId] : [])))];
  const earliest = due.reduce((min, d) => (d.sub.nextInvoiceDate! < min ? d.sub.nextInvoiceDate! : min), asOf);
  const [lineRows, taxes, discountRows, existing] = await Promise.all([
    db.select().from(subscriptionLines).where(inArray(subscriptionLines.subscriptionId, ids)),
    loadTaxes(),
    discountIds.length ? db.select().from(discounts).where(inArray(discounts.id, discountIds)) : Promise.resolve([]),
    db
      .select({ subscriptionId: invoices.subscriptionId, periodStart: invoices.periodStart })
      .from(invoices)
      .where(and(inArray(invoices.subscriptionId, ids), gte(invoices.periodStart, earliest))),
  ]);
  const types = await loadProductTypes([...new Set(lineRows.flatMap((l) => (l.productId ? [l.productId] : [])))]);
  const alreadyBilled = new Set(existing.map((e) => `${e.subscriptionId}|${e.periodStart}`));
  // Usage is tracked as the run goes, so a discount that runs out part-way stops applying.
  const discountState = new Map<string, DiscountRule>(discountRows.map((d) => [d.id, { ...d }]));

  const plan: BillingPlan = { ...empty, invoices: [], skipped: [], changes: [] };

  for (const { sub, plan: subPlan, customerName } of due) {
    const lines: PricingLine[] = lineRows
      .filter((l) => l.subscriptionId === sub.id)
      // Plan line first, then products.
      .sort((a, b) => (a.productId === null ? -1 : b.productId === null ? 1 : 0))
      .map((l) => ({ productId: l.productId, productType: (l.productId && types.get(l.productId)) || "service", description: l.description, qty: l.qty, unitPrice: l.unitPrice }));

    const { periods, nextInvoiceDate, reachesExpiry } = duePeriods({ ...sub, period: subPlan.period }, asOf);
    const discount = sub.discountId ? discountState.get(sub.discountId) ?? null : null;

    for (const [i, period] of periods.entries()) {
      if (alreadyBilled.has(`${sub.id}|${period.start}`)) {
        plan.skipped.push({ subscriptionNumber: sub.number, customerName, periodStart: period.start });
        continue;
      }
      const pricing = priceLines(lines, { taxes, discount, onDate: period.start });
      if (pricing.discount?.applied && discount) discount.timesUsed += 1;

      const flags: Flag[] = [];
      if (periods.length > 1) flags.push("catch_up");
      const last = i === periods.length - 1;
      if (last && reachesExpiry) flags.push(subPlan.autoClose ? "auto_close" : "final_invoice");
      if (pricing.discount && !pricing.discount.applied) flags.push("discount_stopped");
      if (pricing.discount?.applied && discount?.endsOn && discount.endsOn <= addDays(asOf, 30)) flags.push("discount_ending");

      plan.invoices.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        customerId: sub.customerId,
        customerName,
        planName: subPlan.name,
        periodStart: period.start,
        periodEnd: period.end,
        issueDate: period.start,
        dueDate: addDays(period.start, sub.paymentTermsDays),
        pricing,
        discountId: pricing.discount?.applied ? sub.discountId : null,
        flags,
      });
    }

    plan.changes.push({ subscriptionId: sub.id, nextInvoiceDate, close: reachesExpiry && subPlan.autoClose, mrr: sub.mrr });
  }

  plan.totals = {
    count: plan.invoices.length,
    amount: plan.invoices.reduce((s, i) => s + i.pricing.total, 0),
    customers: new Set(plan.invoices.map((i) => i.customerId)).size,
    discounts: plan.invoices.filter((i) => i.pricing.discountTotal > 0).length,
    closing: plan.changes.filter((c) => c.close).length,
  };
  return plan;
}

export type BillingResult = {
  asOf: string;
  created: number;
  skipped: number;
  amount: number;
  closed: number;
  emailed: number;
  invoiceIds: string[];
};

const CHUNK = 200;

/**
 * Bills everything due on `asOf`. Invoices are created confirmed (ready to collect) and emailed when
 * `send` is on; otherwise they're created as drafts for review.
 *
 * Writes are batched per chunk of subscriptions (one insert for invoices, one for lines, one update
 * for billing dates), so a run of hundreds of invoices takes seconds, not minutes.
 */
export async function runBilling(asOf: string, { actorId, send = true }: { actorId: string | null; send?: boolean }): Promise<BillingResult> {
  if (asOf > today()) throw new Error("Billing can't run for a future date. Use the preview to look ahead.");
  const plan = await planBilling(asOf);
  const result: BillingResult = { asOf, created: 0, skipped: plan.skipped.length, amount: 0, closed: 0, emailed: 0, invoiceIds: [] };

  const bySub = Map.groupBy(plan.invoices, (i) => i.subscriptionId);
  for (let i = 0; i < plan.changes.length; i += CHUNK) {
    const chunk = plan.changes.slice(i, i + CHUNK);
    const planned = chunk.flatMap((c) => bySub.get(c.subscriptionId) ?? []);

    await db.transaction(async (tx) => {
      // One billing writer at a time, so invoice numbers stay sequential and two runs can't race.
      await tx.execute(sql`select pg_advisory_xact_lock(4202)`);

      // Number every invoice in this chunk up front (sequences run per issue year).
      const counters = new Map<string, number>();
      for (const year of new Set(planned.map((p) => p.issueDate.slice(0, 4)))) {
        const [{ max }] = await tx
          .select({ max: sql<string | null>`max(${invoices.number})` })
          .from(invoices)
          .where(sql`${invoices.number} like ${`INV-${year}-%`}`);
        counters.set(year, max ? Number(max.slice(-6)) : 0);
      }
      const numbered = planned.map((inv) => {
        const year = inv.issueDate.slice(0, 4);
        const n = counters.get(year)! + 1;
        counters.set(year, n);
        return { inv, number: invoiceNumber(year, n) };
      });

      const inserted = numbered.length
        ? await tx
            .insert(invoices)
            .values(
              numbered.map(({ inv, number }) => ({
                number,
                subscriptionId: inv.subscriptionId,
                customerId: inv.customerId,
                status: send ? ("confirmed" as const) : ("draft" as const),
                periodStart: inv.periodStart,
                periodEnd: inv.periodEnd,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                subtotal: inv.pricing.subtotal,
                discountTotal: inv.pricing.discountTotal,
                taxTotal: inv.pricing.taxTotal,
                total: inv.pricing.total,
                discountId: inv.discountId,
              })),
            )
            // A period another run already billed is skipped, never invoiced twice.
            .onConflictDoNothing({ target: [invoices.subscriptionId, invoices.periodStart] })
            .returning({ id: invoices.id, subscriptionId: invoices.subscriptionId, periodStart: invoices.periodStart })
        : [];

      const created = new Map(inserted.map((r) => [`${r.subscriptionId}|${r.periodStart}`, r.id]));
      const createdInvoices = planned.flatMap((inv) => {
        const id = created.get(`${inv.subscriptionId}|${inv.periodStart}`);
        return id ? [{ id, inv }] : [];
      });
      result.skipped += planned.length - createdInvoices.length;

      if (createdInvoices.length) {
        await tx.insert(invoiceLines).values(
          createdInvoices.flatMap(({ id, inv }) =>
            inv.pricing.lines.map((l) => ({
              invoiceId: id,
              productId: l.productId,
              description: l.description,
              qty: l.qty,
              unitPrice: l.unitPrice,
              discount: l.discount,
              taxRateBps: l.taxRateBps,
              taxAmount: l.taxAmount,
              amount: l.amount,
            })),
          ),
        );
      }

      // Discount usage, counted per discount.
      const uses = new Map<string, number>();
      for (const { inv } of createdInvoices) if (inv.discountId) uses.set(inv.discountId, (uses.get(inv.discountId) ?? 0) + 1);
      for (const [discountId, n] of uses) {
        await tx.update(discounts).set({ timesUsed: sql`${discounts.timesUsed} + ${n}` }).where(eq(discounts.id, discountId));
      }

      // Advance billing dates in one statement; close the ones that reached expiry.
      const advancing = chunk.filter((c) => !c.close);
      if (advancing.length) {
        const values = sql.join(
          advancing.map((c) => sql`(${c.subscriptionId}::uuid, ${c.nextInvoiceDate}::date)`),
          sql`, `,
        );
        await tx.execute(sql`update ${subscriptions} set next_invoice_date = v.next from (values ${values}) as v(id, next) where ${subscriptions.id} = v.id`);
      }
      const closing = chunk.filter((c) => c.close);
      if (closing.length) {
        await tx
          .update(subscriptions)
          .set({ nextInvoiceDate: null, status: "closed" })
          .where(inArray(subscriptions.id, closing.map((c) => c.subscriptionId)));
        await tx.insert(subscriptionEvents).values(
          closing.map((c) => ({
            subscriptionId: c.subscriptionId,
            fromStatus: "active" as const,
            toStatus: "closed" as const,
            mrrDelta: -c.mrr,
            actorId,
            note: "Closed automatically at expiry",
          })),
        );
        result.closed += closing.length;
      }

      result.created += createdInvoices.length;
      result.amount += createdInvoices.reduce((sum, { inv }) => sum + inv.pricing.total, 0);
      result.invoiceIds.push(...createdInvoices.map((c) => c.id));
    });
  }

  if (send && result.invoiceIds.length) result.emailed = await sendInvoiceEmails(result.invoiceIds);
  return result;
}
