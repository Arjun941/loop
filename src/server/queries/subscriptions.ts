/**
 * Reads for the subscription form and detail page.
 */
import "server-only";
import { today } from "@/lib/dates";
import { availableActions } from "@/lib/domain/subscription-status";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import {
  customers,
  discounts,
  invoices,
  plans,
  products,
  productVariants,
  quotationTemplates,
  subscriptionEvents,
  subscriptionLines,
  subscriptions,
  taxes,
  templateLines,
  profiles,
} from "@/server/db/schema";
import { priceSubscription } from "@/server/services/subscriptions";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

/** Everything the subscription form needs to build lines and preview totals in the browser. */
export async function getSubscriptionFormData() {
  await requireStaff();
  const [templateRows, lineRows, planRows, productRows, variantRows, discountRows, taxRows] = await Promise.all([
    db.select().from(quotationTemplates).orderBy(asc(quotationTemplates.name)),
    db.select().from(templateLines),
    db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.price)),
    db.select({ id: products.id, name: products.name, type: products.type, salesPrice: products.salesPrice }).from(products).where(eq(products.active, true)).orderBy(asc(products.name)),
    db.select().from(productVariants),
    db.select().from(discounts).where(eq(discounts.active, true)).orderBy(asc(discounts.name)),
    db.select().from(taxes).where(eq(taxes.active, true)),
  ]);
  return {
    templates: templateRows.map((t) => ({ ...t, lines: lineRows.filter((l) => l.templateId === t.id) })),
    plans: planRows,
    products: productRows.map((p) => ({ ...p, variants: variantRows.filter((v) => v.productId === p.id) })),
    discounts: discountRows,
    taxes: taxRows,
  };
}
export type SubscriptionFormData = Awaited<ReturnType<typeof getSubscriptionFormData>>;

/** Customer search for the picker: name or email, a handful of results. */
export async function searchCustomers(q: string) {
  await requireStaff();
  const term = `%${q.trim()}%`;
  return db
    .select({ id: customers.id, name: customers.name, email: customers.email })
    .from(customers)
    .where(q.trim() ? or(ilike(customers.name, term), ilike(customers.email, term)) : undefined)
    .orderBy(asc(customers.name))
    .limit(8);
}

export async function getSubscription(id: string) {
  const viewer = await requireStaff();
  const [row] = await db
    .select({ sub: subscriptions, plan: plans, customer: customers, discountName: discounts.name })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .leftJoin(discounts, eq(discounts.id, subscriptions.discountId))
    .where(eq(subscriptions.id, id));
  if (!row) return null;

  const [lines, events, invoiceRows] = await Promise.all([
    db.select().from(subscriptionLines).where(eq(subscriptionLines.subscriptionId, id)).orderBy(asc(subscriptionLines.productId)),
    db
      .select({ event: subscriptionEvents, actor: profiles.name })
      .from(subscriptionEvents)
      .leftJoin(profiles, eq(profiles.id, subscriptionEvents.actorId))
      .where(eq(subscriptionEvents.subscriptionId, id))
      .orderBy(desc(subscriptionEvents.at)),
    db
      .select({ id: invoices.id, number: invoices.number, status: invoices.status, issueDate: invoices.issueDate, dueDate: invoices.dueDate, total: invoices.total, amountPaid: invoices.amountPaid })
      .from(invoices)
      .where(and(eq(invoices.subscriptionId, id)))
      .orderBy(desc(invoices.issueDate))
      .limit(12),
  ]);

  // Plan line first (it has no product), then products.
  const ordered = [...lines.filter((l) => !l.productId), ...lines.filter((l) => l.productId)];
  const now = today();
  return {
    ...row,
    lines: ordered,
    pricing: await priceSubscription(ordered, row.sub.discountId),
    events: events.map(({ event, actor }) => ({ ...event, actor })),
    invoices: invoiceRows.map((i) => ({ ...i, overdue: i.status === "confirmed" && i.dueDate < now && i.total > i.amountPaid })),
    actions: availableActions({ status: row.sub.status, plan: row.plan, expiryDate: row.sub.expiryDate, today: now }),
    viewerRole: viewer.role,
  };
}
export type SubscriptionDetail = NonNullable<Awaited<ReturnType<typeof getSubscription>>>;
