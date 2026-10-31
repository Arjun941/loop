/**
 * Paginated, searchable lists for the back-office tables.
 * Each list returns one page of rows plus the total count for pagination.
 */
import "server-only";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import { customers, invoices, payments, plans, subscriptions } from "@/server/db/schema";
import { today } from "@/lib/dates";
import { and, count, desc, eq, gt, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";

export const PAGE_SIZE = 25;

export type ListParams = { q?: string; status?: string; page?: number };

function offset(page = 1) {
  return (Math.max(1, page) - 1) * PAGE_SIZE;
}

export async function listSubscriptions({ q, status, page = 1 }: ListParams) {
  await requireStaff();
  const where: SQL[] = [];
  if (status && status !== "all") where.push(eq(subscriptions.status, status as never));
  if (q) where.push(or(ilike(subscriptions.number, `%${q}%`), ilike(customers.name, `%${q}%`))!);
  const filter = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        number: subscriptions.number,
        status: subscriptions.status,
        customer: customers.name,
        plan: plans.name,
        period: plans.period,
        mrr: subscriptions.mrr,
        nextInvoiceDate: subscriptions.nextInvoiceDate,
        expiryDate: subscriptions.expiryDate,
      })
      .from(subscriptions)
      .innerJoin(customers, eq(customers.id, subscriptions.customerId))
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(filter)
      .orderBy(desc(subscriptions.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(page)),
    db
      .select({ total: count() })
      .from(subscriptions)
      .innerJoin(customers, eq(customers.id, subscriptions.customerId))
      .where(filter),
  ]);
  return { rows, total };
}

export async function listCustomers({ q, page = 1 }: ListParams) {
  await requireStaff();
  const filter = q ? or(ilike(customers.name, `%${q}%`), ilike(customers.email, `%${q}%`)) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, email: customers.email, company: customers.company })
      .from(customers)
      .where(filter)
      .orderBy(customers.name)
      .limit(PAGE_SIZE)
      .offset(offset(page)),
    db.select({ total: count() }).from(customers).where(filter),
  ]);

  // Aggregate only for the customers on this page, then merge.
  const ids = rows.map((r) => r.id);
  const [subStats, balances] = ids.length
    ? await Promise.all([
        db
          .select({ customerId: subscriptions.customerId, active: sql<number>`count(*)::int`, mrr: sql<number>`sum(${subscriptions.mrr})::float8` })
          .from(subscriptions)
          .where(and(inArray(subscriptions.customerId, ids), eq(subscriptions.status, "active")))
          .groupBy(subscriptions.customerId),
        db
          .select({ customerId: invoices.customerId, balance: sql<number>`sum(${invoices.total} - ${invoices.amountPaid})::float8` })
          .from(invoices)
          .where(and(inArray(invoices.customerId, ids), eq(invoices.status, "confirmed")))
          .groupBy(invoices.customerId),
      ])
    : [[], []];
  const subsBy = new Map(subStats.map((s) => [s.customerId, s]));
  const balanceBy = new Map(balances.map((b) => [b.customerId, b.balance]));

  return {
    rows: rows.map((r) => ({
      ...r,
      activeSubs: subsBy.get(r.id)?.active ?? 0,
      mrr: subsBy.get(r.id)?.mrr ?? 0,
      balance: balanceBy.get(r.id) ?? 0,
    })),
    total,
  };
}

export async function listInvoices({ q, status, page = 1 }: ListParams) {
  await requireStaff();
  const now = today();
  const where: SQL[] = [];
  if (status === "overdue") {
    where.push(eq(invoices.status, "confirmed"), lt(invoices.dueDate, now), gt(invoices.total, invoices.amountPaid));
  } else if (status && status !== "all") {
    where.push(eq(invoices.status, status as never));
  }
  if (q) where.push(or(ilike(invoices.number, `%${q}%`), ilike(customers.name, `%${q}%`))!);
  const filter = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        customer: customers.name,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(filter)
      .orderBy(desc(invoices.issueDate), desc(invoices.number))
      .limit(PAGE_SIZE)
      .offset(offset(page)),
    db
      .select({ total: count() })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(filter),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      overdue: r.status === "confirmed" && r.dueDate < now && r.total > r.amountPaid,
    })),
    total,
  };
}

export async function listPayments({ q, page = 1 }: ListParams) {
  await requireStaff();
  const filter = q ? or(ilike(invoices.number, `%${q}%`), ilike(customers.name, `%${q}%`)) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: payments.id,
        paidOn: payments.paidOn,
        method: payments.method,
        amount: payments.amount,
        note: payments.note,
        source: payments.source,
        invoiceId: payments.invoiceId,
        invoice: invoices.number,
        customer: customers.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(filter)
      .orderBy(desc(payments.paidOn), desc(payments.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset(page)),
    db
      .select({ total: count() })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(filter),
  ]);
  return { rows, total };
}
