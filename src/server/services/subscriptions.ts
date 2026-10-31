/**
 * Subscription writes: creating and editing quotes, and moving through the lifecycle.
 *
 * Callers (server actions) handle auth; this module handles the rules:
 * - prices come from the catalog, never from the client;
 * - every status change is checked by `checkAction` and recorded as an event;
 * - monthly recurring revenue (MRR) is kept on the row and every change to it is logged,
 *   which is what the revenue movement view adds up.
 */
import "server-only";
import { addDays, daysBetween, monthlyFactor, today, type Period } from "@/lib/dates";
import { priceLines, type PricingLine } from "@/lib/domain/pricing";
import { checkAction, isEditable, type SubscriptionAction, type SubscriptionStatus } from "@/lib/domain/subscription-status";
import { formatDate, money } from "@/lib/format";
import type { SubscriptionInput } from "@/lib/validation/subscription";
import { db } from "@/server/db";
import { customers, plans, subscriptionEvents, subscriptionLines, subscriptions } from "@/server/db/schema";
import { getCompanyName } from "@/server/company";
import { sendEmail } from "@/server/email/send";
import { QuotationEmail } from "@/server/email/templates/quotation";
import { appUrl } from "@/server/env";
import { and, eq, sql } from "drizzle-orm";
import { createElement } from "react";
import { loadCatalogPrices, loadDiscount, loadProductTypes, loadTaxes } from "./pricing-context";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class SubscriptionError extends Error {
  constructor(
    message: string,
    /** Form field the problem belongs to, if any. */
    public field?: string,
  ) {
    super(message);
  }
}

const PER: Record<Period, string> = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

// ─── Lines and pricing ───────────────────────────────────────────────────────

/** Builds stored lines from the form: the plan line first, then products at catalog prices. */
async function buildLines(input: SubscriptionInput, tx: Tx) {
  const [plan] = await tx.select().from(plans).where(eq(plans.id, input.planId));
  if (!plan || !plan.active) throw new SubscriptionError("That plan isn't available", "planId");
  if (input.planQty < plan.minQty) throw new SubscriptionError(`This plan needs at least ${plan.minQty}`, "planQty");
  const start = input.startDate;
  if ((plan.startsOn && start < plan.startsOn) || (plan.endsOn && start > plan.endsOn)) {
    throw new SubscriptionError("The plan isn't available on that start date", "startDate");
  }

  const catalog = await loadCatalogPrices([...new Set(input.lines.map((l) => l.productId))], tx);
  const productLines = input.lines.map((l) => {
    const product = catalog.products.get(l.productId);
    if (!product || !product.active) throw new SubscriptionError("A product is no longer available", "lines");
    const variant = l.variantId ? catalog.variants.get(l.variantId) : null;
    if (l.variantId && (!variant || variant.productId !== product.id)) throw new SubscriptionError("A variant doesn't match its product", "lines");
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      description: variant ? `${product.name} (${variant.value})` : product.name,
      qty: l.qty,
      unitPrice: product.salesPrice + (variant?.extraPrice ?? 0),
    };
  });

  const planLine = { productId: null, variantId: null, description: plan.name, qty: input.planQty, unitPrice: plan.price };
  return { plan, lines: [planLine, ...productLines] };
}

/** Prices stored lines with the current taxes and the subscription's discount. */
export async function priceSubscription(
  lines: { productId: string | null; description: string; qty: number; unitPrice: number }[],
  discountId: string | null,
  onDate = today(),
  tx: Pick<typeof db, "select"> = db,
) {
  const [types, taxes, discount] = await Promise.all([
    loadProductTypes(lines.flatMap((l) => (l.productId ? [l.productId] : [])), tx),
    loadTaxes(tx),
    loadDiscount(discountId, tx),
  ]);
  const pricing: PricingLine[] = lines.map((l) => ({
    productId: l.productId,
    productType: (l.productId && types.get(l.productId)) || "service",
    description: l.description,
    qty: l.qty,
    unitPrice: l.unitPrice,
  }));
  return priceLines(pricing, { taxes, discount, onDate });
}

/** Monthly value of a subscription: its per-period amount after discount, before tax. */
function monthlyValue(subtotal: number, discountTotal: number, period: Period) {
  return Math.round((subtotal - discountTotal) * monthlyFactor(period));
}

// ─── Create and edit ─────────────────────────────────────────────────────────

async function nextNumber(tx: Tx) {
  // Serialise numbering so two quotes created at once can't collide.
  await tx.execute(sql`select pg_advisory_xact_lock(4201)`);
  const [{ max }] = await tx.select({ max: sql<string | null>`max(${subscriptions.number})` }).from(subscriptions);
  const n = max ? Number(max.replace(/\D/g, "")) + 1 : 1;
  return `SUB-${String(n).padStart(5, "0")}`;
}

/** Creates a draft, or updates one that's still a draft or quotation. Returns its id and status. */
export async function saveSubscription(input: SubscriptionInput, actorId: string) {
  return db.transaction(async (tx) => {
    const { plan, lines } = await buildLines(input, tx);
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, input.customerId));
    if (!customer) throw new SubscriptionError("Choose a customer", "customerId");

    const fields = {
      customerId: input.customerId,
      planId: plan.id,
      startDate: input.startDate,
      expiryDate: input.expiryDate,
      quoteValidUntil: input.quoteValidUntil,
      paymentTermsDays: input.paymentTermsDays,
      discountId: input.discountId ?? null,
    };

    let id = input.id;
    let status: SubscriptionStatus = "draft";
    if (id) {
      const [existing] = await tx.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.id, id));
      if (!existing) throw new SubscriptionError("Subscription not found");
      if (!isEditable(existing.status)) throw new SubscriptionError("Only drafts and quotations can be edited");
      status = existing.status;
      await tx.update(subscriptions).set(fields).where(eq(subscriptions.id, id));
      await tx.delete(subscriptionLines).where(eq(subscriptionLines.subscriptionId, id));
    } else {
      const [row] = await tx
        .insert(subscriptions)
        .values({ ...fields, number: await nextNumber(tx), status: "draft" })
        .returning({ id: subscriptions.id });
      id = row.id;
      await tx.insert(subscriptionEvents).values({ subscriptionId: id, toStatus: "draft", actorId, note: "Created" });
    }

    await tx.insert(subscriptionLines).values(lines.map((l) => ({ ...l, subscriptionId: id })));
    return { id, status };
  });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

/** Runs one lifecycle action. Returns a short message for the UI. */
export async function runSubscriptionAction(id: string, action: SubscriptionAction, actorId: string) {
  const now = today();
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ sub: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.id, id));
    if (!row) throw new SubscriptionError("Subscription not found");
    const { sub, plan } = row;

    const check = checkAction(action, { status: sub.status, plan, expiryDate: sub.expiryDate, today: now });
    if (!check.ok) throw new SubscriptionError(check.reason);

    const lines = await tx.select().from(subscriptionLines).where(eq(subscriptionLines.subscriptionId, id));
    if (lines.length === 0) throw new SubscriptionError("Add a plan before continuing");

    const changes: Partial<typeof subscriptions.$inferInsert> = { status: check.to };
    let mrrDelta = 0;
    let note: string | undefined;

    switch (action) {
      case "send_quote":
        changes.quoteValidUntil = sub.quoteValidUntil ?? addDays(now, 30);
        break;
      case "activate": {
        const priced = await priceSubscription(lines, sub.discountId, now, tx);
        changes.mrr = monthlyValue(priced.subtotal, priced.discountTotal, plan.period);
        // First invoice on the start date (or today, if the start date has passed).
        changes.nextInvoiceDate = sub.startDate > now ? sub.startDate : now;
        mrrDelta = changes.mrr;
        break;
      }
      case "pause":
        mrrDelta = -sub.mrr;
        break;
      case "resume":
        mrrDelta = sub.mrr;
        changes.nextInvoiceDate = sub.nextInvoiceDate && sub.nextInvoiceDate > now ? sub.nextInvoiceDate : now;
        break;
      case "renew": {
        // Extend by the same length as the original term.
        const term = daysBetween(sub.startDate, sub.expiryDate!);
        changes.expiryDate = addDays(sub.expiryDate!, term);
        note = `Renewed until ${formatDate(changes.expiryDate)}`;
        break;
      }
      case "close":
        mrrDelta = sub.status === "active" ? -sub.mrr : 0;
        changes.nextInvoiceDate = null;
        break;
    }

    // Guard against two people acting at once: only update if the status hasn't moved.
    const updated = await tx
      .update(subscriptions)
      .set(changes)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.status, sub.status)))
      .returning({ id: subscriptions.id });
    if (updated.length === 0) throw new SubscriptionError("Someone else just changed this subscription. Refresh and try again.");

    await tx.insert(subscriptionEvents).values({
      subscriptionId: id,
      fromStatus: sub.status,
      toStatus: check.to as SubscriptionStatus,
      mrrDelta,
      actorId,
      note: note ?? null,
    });
    return { sub: { ...sub, ...changes }, plan, lines };
  });

  if (action === "send_quote") await sendQuotation(result.sub.id);
  return result;
}

// ─── Quotation email ─────────────────────────────────────────────────────────

/** Emails the quotation to the customer. Also used to resend an updated quote. */
export async function sendQuotation(id: string) {
  const [row] = await db
    .select({ sub: subscriptions, plan: plans, customer: customers })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .where(eq(subscriptions.id, id));
  const lines = await db.select().from(subscriptionLines).where(eq(subscriptionLines.subscriptionId, id));
  const priced = await priceSubscription(lines, row.sub.discountId);

  await sendEmail({
    to: row.customer.email,
    subject: `Quotation ${row.sub.number} from ${await getCompanyName()}`,
    template: "quotation",
    customerId: row.customer.id,
    element: createElement(QuotationEmail, {
      customerName: row.customer.name,
      number: row.sub.number,
      planName: row.plan.name,
      period: PER[row.plan.period],
      lines: priced.lines.map((l) => ({ description: l.description, qty: l.qty, amount: money(l.amount) })),
      subtotal: money(priced.subtotal),
      discount: priced.discountTotal ? money(priced.discountTotal) : null,
      tax: money(priced.taxTotal),
      total: money(priced.total),
      validUntil: row.sub.quoteValidUntil ? formatDate(row.sub.quoteValidUntil) : null,
      paymentTermsDays: row.sub.paymentTermsDays,
      startDate: formatDate(row.sub.startDate),
      portalUrl: appUrl("/portal"),
    }),
  });
}
