/**
 * Data for the customer portal. Every query is scoped to the signed-in customer's own records.
 */
import "server-only";
import { requireCustomer } from "@/server/auth/access";
import { db } from "@/server/db";
import { customers, invoices, plans, subscriptions } from "@/server/db/schema";
import { today } from "@/lib/dates";
import { and, desc, eq, ne } from "drizzle-orm";

export async function getPortalOverview() {
  const user = await requireCustomer();
  const now = today();

  const [[customer], subs, invs] = await Promise.all([
    db.select({ name: customers.name }).from(customers).where(eq(customers.id, user.customerId)),
    db
      .select({
        id: subscriptions.id,
        number: subscriptions.number,
        status: subscriptions.status,
        plan: plans.name,
        period: plans.period,
        nextInvoiceDate: subscriptions.nextInvoiceDate,
        expiryDate: subscriptions.expiryDate,
        mrr: subscriptions.mrr,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(and(eq(subscriptions.customerId, user.customerId), ne(subscriptions.status, "draft")))
      .orderBy(desc(subscriptions.createdAt)),
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
      })
      .from(invoices)
      .where(and(eq(invoices.customerId, user.customerId), ne(invoices.status, "draft")))
      .orderBy(desc(invoices.issueDate))
      .limit(12),
  ]);

  return {
    firstName: user.name.split(" ")[0],
    company: customer?.name ?? user.name,
    subscriptions: subs,
    invoices: invs.map((i) => ({ ...i, overdue: i.status === "confirmed" && i.dueDate < now && i.total > i.amountPaid })),
  };
}
