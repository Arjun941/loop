/**
 * The finance overview: recurring revenue and how it moved, money billed vs collected,
 * what's owed and overdue, and the revenue at risk. Every number is a SQL aggregate,
 * so it stays fast with tens of thousands of invoices.
 */
import "server-only";
import { addDays, addMonths, daysBetween, today } from "@/lib/dates";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import { customers, invoices, payments, plans, subscriptionEvents, subscriptions } from "@/server/db/schema";
import { and, asc, desc, eq, gt, gte, isNotNull, lt, lte, ne, sql, type SQL } from "drizzle-orm";

export const RANGES = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  ytd: "Year to date",
} as const;
export type Range = keyof typeof RANGES;

export function rangeStart(range: Range, now = today()) {
  switch (range) {
    case "30d":
      return addDays(now, -30);
    case "90d":
      return addDays(now, -90);
    case "12m":
      return addMonths(now, -12);
    case "ytd":
      return `${now.slice(0, 4)}-01-01`;
  }
}

const AGE_BUCKETS = [
  { bucket: "1–30 days", maxDays: 30 },
  { bucket: "31–60 days", maxDays: 60 },
  { bucket: "61–90 days", maxDays: 90 },
  { bucket: "90+ days", maxDays: Infinity },
];

/** Sorts overdue amounts (grouped by due date) into age buckets. */
function ageBuckets(rows: { dueDate: string; amount: number; count: number }[], now: string) {
  const out = AGE_BUCKETS.map((b) => ({ bucket: b.bucket, amount: 0, count: 0 }));
  for (const r of rows) {
    const days = daysBetween(r.dueDate, now);
    const i = AGE_BUCKETS.findIndex((b) => days <= b.maxDays);
    out[i].amount += r.amount;
    out[i].count += r.count;
  }
  return out;
}

const num = (expr: SQL) => sql<number>`coalesce(${expr}, 0)::float8`;

export async function getDashboard({ range, planId }: { range: Range; planId: string | null }) {
  await requireStaff();
  const now = today();
  const start = rangeStart(range, now);
  const startTs = new Date(`${start}T00:00:00Z`);

  // Optional plan filter, applied through the subscription each row belongs to.
  const subPlan = planId ? eq(subscriptions.planId, planId) : undefined;
  const invoiceSub = planId ? sql`${invoices.subscriptionId} in (select id from ${subscriptions} where ${subscriptions.planId} = ${planId})` : undefined;
  const overdue = and(eq(invoices.status, "confirmed"), lt(invoices.dueDate, now), gt(invoices.total, invoices.amountPaid), invoiceSub);
  const balance = sql`${invoices.total} - ${invoices.amountPaid}`;
  const twelveMonthsAgo = `${addMonths(now, -11).slice(0, 7)}-01`;

  const [
    [mrrNow],
    [mrrAtStart],
    movement,
    [collected],
    [billed],
    [outstanding],
    [overdueTotals],
    aging,
    monthlyBilled,
    monthlyCollected,
    overdueRisk,
    pausedRisk,
    expiringRisk,
    [due],
    planOptions,
  ] = await Promise.all([
    db
      .select({ mrr: num(sql`sum(${subscriptions.mrr})`), active: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, "active"), subPlan)),
    // MRR on the start date = every revenue change logged before it.
    db
      .select({ mrr: num(sql`sum(${subscriptionEvents.mrrDelta})`) })
      .from(subscriptionEvents)
      .innerJoin(subscriptions, eq(subscriptions.id, subscriptionEvents.subscriptionId))
      .where(and(lt(subscriptionEvents.at, startTs), subPlan)),
    db
      .select({
        kind: sql<"new" | "resumed" | "paused" | "churned" | "other">`case
          when ${subscriptionEvents.toStatus} = 'active' and ${subscriptionEvents.fromStatus} = 'paused' then 'resumed'
          when ${subscriptionEvents.toStatus} = 'active' then 'new'
          when ${subscriptionEvents.toStatus} = 'paused' then 'paused'
          when ${subscriptionEvents.toStatus} = 'closed' then 'churned'
          else 'other' end`,
        amount: num(sql`sum(${subscriptionEvents.mrrDelta})`),
        count: sql<number>`count(*) filter (where ${subscriptionEvents.mrrDelta} <> 0)::int`,
      })
      .from(subscriptionEvents)
      .innerJoin(subscriptions, eq(subscriptions.id, subscriptionEvents.subscriptionId))
      .where(and(gte(subscriptionEvents.at, startTs), subPlan))
      .groupBy(sql`1`),
    db
      .select({ amount: num(sql`sum(${payments.amount})`) })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(and(gte(payments.paidOn, start), invoiceSub)),
    db
      .select({ amount: num(sql`sum(${invoices.total})`) })
      .from(invoices)
      .where(and(gte(invoices.issueDate, start), lte(invoices.issueDate, now), ne(invoices.status, "cancelled"), ne(invoices.status, "draft"), invoiceSub)),
    db
      .select({ amount: num(sql`sum(${balance})`) })
      .from(invoices)
      .where(and(eq(invoices.status, "confirmed"), invoiceSub)),
    db.select({ amount: num(sql`sum(${balance})`), count: sql<number>`count(*)::int` }).from(invoices).where(overdue),
    // Grouped by due date in SQL; the age buckets are worked out below (simpler for the planner).
    db
      .select({ dueDate: invoices.dueDate, amount: num(sql`sum(${balance})`), count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(overdue)
      .groupBy(invoices.dueDate),
    db
      .select({ month: sql<string>`to_char(${invoices.issueDate}, 'YYYY-MM')`, amount: num(sql`sum(${invoices.total})`) })
      .from(invoices)
      .where(and(gte(invoices.issueDate, twelveMonthsAgo), lte(invoices.issueDate, now), ne(invoices.status, "cancelled"), ne(invoices.status, "draft"), invoiceSub))
      .groupBy(sql`1`),
    db
      .select({ month: sql<string>`to_char(${payments.paidOn}, 'YYYY-MM')`, amount: num(sql`sum(${payments.amount})`) })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(and(gte(payments.paidOn, twelveMonthsAgo), invoiceSub))
      .groupBy(sql`1`),
    db
      .select({ id: invoices.id, number: invoices.number, customer: customers.name, amount: num(balance), dueDate: invoices.dueDate })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(overdue)
      .orderBy(desc(balance))
      .limit(6),
    db
      .select({ id: subscriptions.id, number: subscriptions.number, customer: customers.name, amount: subscriptions.mrr })
      .from(subscriptions)
      .innerJoin(customers, eq(customers.id, subscriptions.customerId))
      .where(and(eq(subscriptions.status, "paused"), subPlan))
      .orderBy(desc(subscriptions.mrr))
      .limit(6),
    db
      .select({ id: subscriptions.id, number: subscriptions.number, customer: customers.name, amount: subscriptions.mrr, expiryDate: subscriptions.expiryDate })
      .from(subscriptions)
      .innerJoin(customers, eq(customers.id, subscriptions.customerId))
      .where(and(eq(subscriptions.status, "active"), isNotNull(subscriptions.expiryDate), gt(subscriptions.expiryDate, now), lte(subscriptions.expiryDate, addDays(now, 30)), subPlan))
      .orderBy(desc(subscriptions.mrr))
      .limit(6),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, "active"), lte(subscriptions.nextInvoiceDate, now), subPlan)),
    db.select({ id: plans.id, name: plans.name }).from(plans).orderBy(asc(plans.price)),
  ]);

  const move = (kind: string) => movement.find((m) => m.kind === kind) ?? { amount: 0, count: 0 };
  const months = Array.from({ length: 12 }, (_, i) => addMonths(`${now.slice(0, 7)}-01`, i - 11).slice(0, 7));

  const risk = [
    ...overdueRisk.map((r) => ({ key: `i-${r.id}`, href: `/invoices/${r.id}`, label: r.customer, detail: `${r.number} · overdue since ${r.dueDate}`, amount: r.amount, kind: "overdue" as const })),
    ...pausedRisk.map((r) => ({ key: `p-${r.id}`, href: `/subscriptions/${r.id}`, label: r.customer, detail: `${r.number} · paused`, amount: r.amount, kind: "paused" as const })),
    ...expiringRisk.map((r) => ({ key: `e-${r.id}`, href: `/subscriptions/${r.id}`, label: r.customer, detail: `${r.number} · ends ${r.expiryDate}`, amount: r.amount, kind: "expiring" as const })),
  ];

  return {
    range,
    planId,
    plans: planOptions,
    mrr: { now: mrrNow.mrr, start: mrrAtStart.mrr, active: mrrNow.active },
    movement: {
      start: mrrAtStart.mrr,
      new: move("new"),
      resumed: move("resumed"),
      paused: move("paused"),
      churned: move("churned"),
      end: mrrNow.mrr,
    },
    collected: collected.amount,
    billed: billed.amount,
    outstanding: outstanding.amount,
    overdue: overdueTotals,
    aging: ageBuckets(aging, now),
    monthly: months.map((m) => ({
      month: m,
      billed: monthlyBilled.find((b) => b.month === m)?.amount ?? 0,
      collected: monthlyCollected.find((c) => c.month === m)?.amount ?? 0,
    })),
    risk: {
      owed: overdueTotals.amount,
      recurring: pausedRisk.reduce((s, r) => s + r.amount, 0) + expiringRisk.reduce((s, r) => s + r.amount, 0),
      items: risk.sort((a, b) => b.amount - a.amount).slice(0, 7),
    },
    dueForBilling: due.count,
  };
}
export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
