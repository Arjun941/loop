/**
 * The MCP tools: Loop's own operations, exposed to LLM clients.
 *
 * Every tool runs as the API key's owner (`runAsUser`), through the same queries and services the
 * web app uses, so permissions and business rules are identical. Money goes in and out in rupees.
 */
import "server-only";
import { today } from "@/lib/dates";
import type { InvoiceAction } from "@/lib/domain/invoice-status";
import { ACTIONS, type SubscriptionAction } from "@/lib/domain/subscription-status";
import { requireStaff, runAsUser, type CurrentUser } from "@/server/auth/access";
import { db } from "@/server/db";
import { customers, invoices, subscriptions } from "@/server/db/schema";
import { getBillingPreview } from "@/server/queries/billing";
import { getCatalogOptions, getDiscounts, getTaxes } from "@/server/queries/catalog";
import { getDashboard } from "@/server/queries/dashboard";
import { getInvoice } from "@/server/queries/invoices";
import { listInvoices, listSubscriptions } from "@/server/queries/lists";
import { getSubscription, searchCustomers } from "@/server/queries/subscriptions";
import { runBilling } from "@/server/services/billing";
import { cancelInvoice, confirmInvoice, InvoiceError, recordPayment, sendInvoice } from "@/server/services/invoices";
import { sendReminders } from "@/server/services/reminders";
import { runSubscriptionAction, saveSubscription, sendQuotation, SubscriptionError } from "@/server/services/subscriptions";
import type { McpServer } from "@modelcontextprotocol/server";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const rupees = (paise: number) => Math.round(paise) / 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts an id or a human number (SUB-00042, INV-2026-000123). */
async function resolveSubscription(ref: string) {
  if (UUID.test(ref)) return ref;
  const [row] = await db.select({ id: subscriptions.id }).from(subscriptions).where(sql`upper(${subscriptions.number}) = ${ref.trim().toUpperCase()}`);
  if (!row) throw new Error(`No subscription ${ref}`);
  return row.id;
}

async function resolveInvoice(ref: string) {
  if (UUID.test(ref)) return ref;
  const [row] = await db.select({ id: invoices.id }).from(invoices).where(sql`upper(${invoices.number}) = ${ref.trim().toUpperCase()}`);
  if (!row) throw new Error(`No invoice ${ref}`);
  return row.id;
}

function refresh() {
  for (const p of ["/dashboard", "/subscriptions", "/invoices", "/payments", "/billing", "/customers"]) revalidatePath(p);
}

type Ctx = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

/** Wraps a tool body: runs it as the key's owner and turns results and rule errors into MCP responses. */
function handler<A>(fn: (args: A) => Promise<unknown>) {
  return async (args: A, ctx: Ctx) => {
    const user = ctx.http?.authInfo?.extra?.user as CurrentUser | undefined;
    if (!user) return { isError: true, content: [{ type: "text" as const, text: "Not authorised." }] };
    try {
      const result = await runAsUser(user, () => fn(args));
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const message = err instanceof SubscriptionError || err instanceof InvoiceError || err instanceof Error ? err.message : "Something went wrong";
      return { isError: true, content: [{ type: "text" as const, text: message }] };
    }
  };
}

const read = { readOnlyHint: true, openWorldHint: false } as const;
const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

export function registerTools(server: McpServer) {
  // ─── Read ──────────────────────────────────────────────────────────────────

  server.registerTool(
    "get_overview",
    {
      title: "Business overview",
      description:
        "Monthly recurring revenue (now and its change), revenue movement (new, resumed, paused, churned), money billed and collected in a period, outstanding and overdue totals, overdue ageing, and the biggest revenue-at-risk items. Amounts in INR.",
      inputSchema: z.object({ range: z.enum(["30d", "90d", "12m", "ytd"]).default("30d").describe("Period for movement, billed and collected") }),
      annotations: read,
    },
    handler(async ({ range }: { range: "30d" | "90d" | "12m" | "ytd" }) => {
      const d = await getDashboard({ range, planId: null });
      return {
        range,
        mrr: { now: rupees(d.mrr.now), atStartOfRange: rupees(d.mrr.start), activeSubscriptions: d.mrr.active },
        movement: {
          new: rupees(d.movement.new.amount),
          resumed: rupees(d.movement.resumed.amount),
          paused: rupees(d.movement.paused.amount),
          churned: rupees(d.movement.churned.amount),
        },
        billed: rupees(d.billed),
        collected: rupees(d.collected),
        outstanding: rupees(d.outstanding),
        overdue: { amount: rupees(d.overdue.amount), invoices: d.overdue.count, byAge: d.aging.map((a) => ({ ...a, amount: rupees(a.amount) })) },
        atRisk: d.risk.items.map((r) => ({ customer: r.label, detail: r.detail, amount: rupees(r.amount), kind: r.kind })),
        subscriptionsDueForBilling: d.dueForBilling,
      };
    }),
  );

  server.registerTool(
    "search_customers",
    {
      title: "Search customers",
      description: "Find customers by name or email. Returns up to 8 with their ids.",
      inputSchema: z.object({ query: z.string().describe("Part of a name or email") }),
      annotations: read,
    },
    handler(async ({ query }: { query: string }) => searchCustomers(query)),
  );

  server.registerTool(
    "list_subscriptions",
    {
      title: "List subscriptions",
      description: "Subscriptions, newest first, 25 per page. Filter by status and search by number or customer name.",
      inputSchema: z.object({
        status: z.enum(["all", "draft", "quotation", "confirmed", "active", "paused", "closed"]).default("all"),
        query: z.string().optional(),
        page: z.number().int().min(1).default(1),
      }),
      annotations: read,
    },
    handler(async ({ status, query, page }: { status: string; query?: string; page: number }) => {
      const { rows, total } = await listSubscriptions({ status, q: query, page });
      return { total, page, subscriptions: rows.map((r) => ({ ...r, mrr: rupees(r.mrr) })) };
    }),
  );

  server.registerTool(
    "get_subscription",
    {
      title: "Get a subscription",
      description: "Full detail of one subscription: customer, plan, lines, priced totals, next invoice, recent invoices, history, and which lifecycle actions are allowed now.",
      inputSchema: z.object({ subscription: z.string().describe("Id or number, e.g. SUB-08001") }),
      annotations: read,
    },
    handler(async ({ subscription }: { subscription: string }) => {
      const s = await getSubscription(await resolveSubscription(subscription));
      if (!s) throw new Error("Subscription not found");
      return {
        id: s.sub.id,
        number: s.sub.number,
        status: s.sub.status,
        customer: { id: s.customer.id, name: s.customer.name, email: s.customer.email },
        plan: { name: s.plan.name, period: s.plan.period, pausable: s.plan.pausable, closable: s.plan.closable, renewable: s.plan.renewable },
        startDate: s.sub.startDate,
        expiryDate: s.sub.expiryDate,
        nextInvoiceDate: s.sub.nextInvoiceDate,
        mrr: rupees(s.sub.mrr),
        lines: s.pricing.lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: rupees(l.unitPrice), amount: rupees(l.amount) })),
        perPeriod: { subtotal: rupees(s.pricing.subtotal), discount: rupees(s.pricing.discountTotal), tax: rupees(s.pricing.taxTotal), total: rupees(s.pricing.total) },
        allowedActions: s.actions,
        recentInvoices: s.invoices.map((i) => ({ number: i.number, status: i.overdue ? "overdue" : i.status, total: rupees(i.total), dueDate: i.dueDate })),
        history: s.events.map((e) => ({ at: e.at, to: e.toStatus, by: e.actor, note: e.note, mrrChange: rupees(e.mrrDelta) })),
      };
    }),
  );

  server.registerTool(
    "list_invoices",
    {
      title: "List invoices",
      description: "Invoices, newest first, 25 per page. Status 'overdue' means confirmed, past due and unpaid.",
      inputSchema: z.object({
        status: z.enum(["all", "overdue", "draft", "confirmed", "paid", "cancelled"]).default("all"),
        query: z.string().optional().describe("Invoice number or customer name"),
        page: z.number().int().min(1).default(1),
      }),
      annotations: read,
    },
    handler(async ({ status, query, page }: { status: string; query?: string; page: number }) => {
      const { rows, total } = await listInvoices({ status, q: query, page });
      return {
        total,
        page,
        invoices: rows.map((r) => ({ id: r.id, number: r.number, customer: r.customer, status: r.overdue ? "overdue" : r.status, issued: r.issueDate, due: r.dueDate, total: rupees(r.total), balance: rupees(r.total - r.amountPaid) })),
      };
    }),
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get an invoice",
      description: "One invoice with its lines, totals, payments, balance, overdue days, and which actions are allowed.",
      inputSchema: z.object({ invoice: z.string().describe("Id or number, e.g. INV-2026-036062") }),
      annotations: read,
    },
    handler(async ({ invoice }: { invoice: string }) => {
      const d = await getInvoice(await resolveInvoice(invoice));
      if (!d) throw new Error("Invoice not found");
      return {
        id: d.inv.id,
        number: d.inv.number,
        status: d.overdue ? "overdue" : d.inv.status,
        customer: d.customer.name,
        subscription: d.subscriptionNumber,
        issued: d.inv.issueDate,
        due: d.inv.dueDate,
        daysOverdue: d.daysOverdue,
        lines: d.lines.map((l) => ({ description: l.description, qty: l.qty, amount: rupees(l.amount), taxRatePercent: l.taxRateBps / 100 })),
        totals: { subtotal: rupees(d.inv.subtotal), discount: rupees(d.inv.discountTotal), tax: rupees(d.inv.taxTotal), total: rupees(d.inv.total), paid: rupees(d.inv.amountPaid), balance: rupees(d.balance) },
        payments: d.payments.map((p) => ({ date: p.paidOn, amount: rupees(p.amount), method: p.method, note: p.note, source: p.source })),
        allowedActions: d.actions,
      };
    }),
  );

  server.registerTool(
    "get_catalog",
    {
      title: "Catalog",
      description: "Active plans, products (with variants and extra prices), discounts and taxes. Use the ids to create subscriptions.",
      inputSchema: z.object({}),
      annotations: read,
    },
    handler(async () => {
      const [options, discounts, taxes] = await Promise.all([getCatalogOptions(), getDiscounts(), getTaxes()]);
      return {
        plans: options.plans.map((p) => ({ id: p.id, name: p.name, price: rupees(p.price), period: p.period, minQty: p.minQty })),
        products: options.products.map((p) => ({ id: p.id, name: p.name, type: p.type, price: rupees(p.salesPrice), variants: p.variants.map((v) => ({ id: v.id, name: `${v.attribute}: ${v.value}`, extra: rupees(v.extraPrice) })) })),
        discounts: discounts.discounts.filter((d) => d.active).map((d) => ({ id: d.id, name: d.name, kind: d.kind, value: d.kind === "percent" ? `${d.value / 100}%` : rupees(d.value), endsOn: d.endsOn, used: d.timesUsed, limit: d.usageLimit })),
        taxes: taxes.taxes.filter((t) => t.active).map((t) => ({ name: t.name, ratePercent: t.rateBps / 100, appliesTo: t.scope })),
      };
    }),
  );

  server.registerTool(
    "preview_billing",
    {
      title: "Preview billing",
      description: "Dry run of billing: which invoices a run would create for everything due by a date (default today), with totals and flags. Writes nothing. Also counts reminders due today.",
      inputSchema: z.object({ asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD; may be in the future to look ahead") }),
      annotations: read,
    },
    handler(async ({ asOf }: { asOf?: string }) => {
      const p = await getBillingPreview(asOf ?? null);
      return {
        asOf: p.asOf,
        invoicesToCreate: p.totals.count,
        totalToBill: rupees(p.totals.amount),
        customers: p.totals.customers,
        alreadyBilledSkipped: p.skipped,
        subscriptionsClosingAtExpiry: p.totals.closing,
        remindersDueToday: p.reminders,
        sample: p.rows.slice(0, 20).map((r) => ({ subscription: r.subscriptionNumber, customer: r.customerName, period: `${r.periodStart} to ${r.periodEnd}`, total: rupees(r.total), flags: r.flags })),
      };
    }),
  );

  // ─── Write ─────────────────────────────────────────────────────────────────

  server.registerTool(
    "create_customer",
    {
      title: "Create a customer",
      description: "Adds a customer (billing contact). Returns its id.",
      inputSchema: z.object({ name: z.string().min(2), email: z.email() }),
      annotations: write,
    },
    handler(async ({ name, email }: { name: string; email: string }) => {
      const [existing] = await db.select({ id: customers.id }).from(customers).where(sql`lower(${customers.email}) = ${email.toLowerCase()}`);
      if (existing) throw new Error(`A customer with ${email} already exists (id ${existing.id})`);
      const [c] = await db.insert(customers).values({ name, email: email.toLowerCase(), company: name }).returning({ id: customers.id, name: customers.name, email: customers.email });
      refresh();
      return c;
    }),
  );

  server.registerTool(
    "create_subscription",
    {
      title: "Create a subscription quote",
      description:
        "Creates a draft subscription for a customer on a plan, with optional extra products and discount. Prices come from the catalog. Set sendQuote to email the quotation right away (status becomes quotation).",
      inputSchema: z.object({
        customerId: z.string().uuid(),
        planId: z.string().uuid(),
        planQuantity: z.number().int().min(1).default(1),
        products: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), quantity: z.number().int().min(1).default(1) })).default([]),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Defaults to today"),
        expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        paymentTermsDays: z.number().int().min(0).max(365).default(15),
        discountId: z.string().uuid().optional(),
        sendQuote: z.boolean().default(false),
      }),
      annotations: write,
    },
    handler(
      async (a: {
        customerId: string;
        planId: string;
        planQuantity: number;
        products: { productId: string; variantId?: string; quantity: number }[];
        startDate?: string;
        expiryDate?: string;
        paymentTermsDays: number;
        discountId?: string;
        sendQuote: boolean;
      }) => {
        const user = await requireStaff();
        const saved = await saveSubscription(
          {
            customerId: a.customerId,
            planId: a.planId,
            planQty: a.planQuantity,
            startDate: a.startDate ?? today(),
            expiryDate: a.expiryDate ?? null,
            quoteValidUntil: null,
            paymentTermsDays: a.paymentTermsDays,
            discountId: a.discountId,
            lines: a.products.map((p) => ({ productId: p.productId, variantId: p.variantId ?? null, qty: p.quantity })),
          },
          user.id,
        );
        if (a.sendQuote) await runSubscriptionAction(saved.id, "send_quote", user.id);
        refresh();
        const s = await getSubscription(saved.id);
        return { id: saved.id, number: s?.sub.number, status: s?.sub.status, totalPerPeriod: s ? rupees(s.pricing.total) : null, quoteEmailed: a.sendQuote };
      },
    ),
  );

  server.registerTool(
    "subscription_action",
    {
      title: "Change a subscription's status",
      description: `Moves a subscription through its lifecycle. Actions: ${Object.entries(ACTIONS)
        .map(([k, v]) => `${k} (${v.label}: from ${v.from.join("/")})`)
        .join("; ")}. Use get_subscription to see which are allowed now. 'resend_quote' re-emails an open quotation.`,
      inputSchema: z.object({
        subscription: z.string().describe("Id or number"),
        action: z.enum(["send_quote", "revise", "confirm", "activate", "pause", "resume", "renew", "close", "discard", "resend_quote"]),
      }),
      annotations: { ...write, destructiveHint: true },
    },
    handler(async ({ subscription, action }: { subscription: string; action: SubscriptionAction | "resend_quote" }) => {
      const user = await requireStaff();
      const id = await resolveSubscription(subscription);
      if (action === "resend_quote") await sendQuotation(id);
      else await runSubscriptionAction(id, action, user.id);
      refresh();
      const s = await getSubscription(id);
      return { number: s?.sub.number, status: s?.sub.status, nextInvoiceDate: s?.sub.nextInvoiceDate, expiryDate: s?.sub.expiryDate, allowedActions: s?.actions };
    }),
  );

  server.registerTool(
    "invoice_action",
    {
      title: "Confirm, send or cancel an invoice",
      description: "confirm (draft → confirmed), send (email it to the customer), cancel (only while nothing is paid).",
      inputSchema: z.object({ invoice: z.string().describe("Id or number"), action: z.enum(["confirm", "send", "cancel"]) }),
      annotations: { ...write, destructiveHint: true },
    },
    handler(async ({ invoice, action }: { invoice: string; action: Exclude<InvoiceAction, "record_payment"> }) => {
      const id = await resolveInvoice(invoice);
      if (action === "confirm") await confirmInvoice(id);
      else if (action === "cancel") await cancelInvoice(id);
      else await sendInvoice(id);
      refresh();
      const [row] = await db.select({ number: invoices.number, status: invoices.status }).from(invoices).where(eq(invoices.id, id));
      return row;
    }),
  );

  server.registerTool(
    "record_payment",
    {
      title: "Record a payment",
      description: "Records money received against a confirmed invoice. Partial payments are fine; it can't exceed the balance. The invoice becomes paid once fully covered.",
      inputSchema: z.object({
        invoice: z.string().describe("Id or number"),
        amount: z.number().positive().describe("Amount in INR"),
        method: z.enum(["bank", "upi", "card", "cheque", "cash"]).default("bank"),
        paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Defaults to today"),
        note: z.string().max(200).optional(),
      }),
      annotations: write,
    },
    handler(async (a: { invoice: string; amount: number; method: "bank" | "upi" | "card" | "cheque" | "cash"; paidOn?: string; note?: string }) => {
      const r = await recordPayment({ invoiceId: await resolveInvoice(a.invoice), amount: Math.round(a.amount * 100), method: a.method, paidOn: a.paidOn ?? today(), note: a.note, source: "manual" });
      refresh();
      return { invoice: r.number, status: r.status, balance: rupees(r.balance) };
    }),
  );

  server.registerTool(
    "run_billing",
    {
      title: "Run billing",
      description:
        "Creates invoices for every subscription due by a date (default today; can't be in the future). Safe to repeat: a period that's already billed is skipped, never billed twice. With sendEmails, invoices are confirmed and emailed; otherwise they're drafts.",
      inputSchema: z.object({
        asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        sendEmails: z.boolean().default(true),
      }),
      annotations: { ...write, idempotentHint: true },
    },
    handler(async ({ asOf, sendEmails }: { asOf?: string; sendEmails: boolean }) => {
      const user = await requireStaff();
      const r = await runBilling(asOf ?? today(), { actorId: user.id, send: sendEmails });
      refresh();
      return { asOf: r.asOf, created: r.created, total: rupees(r.amount), skippedAlreadyBilled: r.skipped, emailed: r.emailed, subscriptionsClosed: r.closed };
    }),
  );

  server.registerTool(
    "send_reminders",
    {
      title: "Send reminders",
      description: "Sends today's overdue reminders (at 1, 7 and 14 days past due) and renewal reminders (14 days before expiry). Each stage is sent once.",
      inputSchema: z.object({}),
      annotations: { ...write, idempotentHint: true },
    },
    handler(async () => {
      await requireStaff();
      const r = await sendReminders();
      refresh();
      return r;
    }),
  );
}
