/**
 * Reads for the invoice page, the payment form and the printable invoice.
 */
import "server-only";
import { today } from "@/lib/dates";
import { availableInvoiceActions, balance, daysOverdue, isOverdue } from "@/lib/domain/invoice-status";
import { requireStaff, requireUser } from "@/server/auth/access";
import { getCompanyName } from "@/server/company";
import { db } from "@/server/db";
import { customers, invoiceLines, invoices, payments, plans, subscriptions } from "@/server/db/schema";
import { and, asc, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

async function loadInvoice(where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({ inv: invoices, customer: customers, subscriptionNumber: subscriptions.number, planName: plans.name })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .leftJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(where);
  if (!row) return null;

  const [lines, paymentRows] = await Promise.all([
    db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, row.inv.id)).orderBy(desc(invoiceLines.amount)),
    db.select().from(payments).where(eq(payments.invoiceId, row.inv.id)).orderBy(desc(payments.paidOn), desc(payments.createdAt)),
  ]);
  const now = today();
  return {
    ...row,
    lines,
    payments: paymentRows,
    balance: balance(row.inv),
    overdue: isOverdue(row.inv, now),
    daysOverdue: isOverdue(row.inv, now) ? daysOverdue(row.inv.dueDate, now) : 0,
    actions: availableInvoiceActions(row.inv),
  };
}

export async function getInvoice(id: string) {
  await requireStaff();
  return loadInvoice(eq(invoices.id, id));
}
export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** For the printable page: staff see any invoice, customers only their own. */
export async function getPrintableInvoice(id: string) {
  const user = await requireUser();
  const [inv, company] = await Promise.all([loadInvoice(eq(invoices.id, id)), getCompanyName()]);
  if (!inv || (user.role === "customer" && inv.inv.customerId !== user.customerId)) notFound();
  return { ...inv, company };
}

/** Open invoices (confirmed, with a balance) matching a number or customer, for the payment form. */
export async function searchOpenInvoices(q: string) {
  await requireStaff();
  const term = `%${q.trim()}%`;
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      customer: customers.name,
      dueDate: invoices.dueDate,
      balance: sql<number>`(${invoices.total} - ${invoices.amountPaid})::int`,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(
      and(
        eq(invoices.status, "confirmed"),
        gt(invoices.total, invoices.amountPaid),
        q.trim() ? or(ilike(invoices.number, term), ilike(customers.name, term)) : undefined,
      ),
    )
    .orderBy(asc(invoices.dueDate))
    .limit(8);
}
