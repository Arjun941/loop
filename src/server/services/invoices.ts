/**
 * Invoice writes: confirm, cancel, send, and record payments.
 * Rules come from `lib/domain/invoice-status`; callers (actions, MCP tools) handle auth.
 */
import "server-only";
import { applyPayment, balance, checkInvoiceAction, type InvoiceAction } from "@/lib/domain/invoice-status";
import { formatDate, money } from "@/lib/format";
import { db } from "@/server/db";
import { customers, invoiceLines, invoices, payments } from "@/server/db/schema";
import { getCompanyName } from "@/server/company";
import { sendEmail } from "@/server/email/send";
import { InvoiceEmail } from "@/server/email/templates/invoice";
import { appUrl } from "@/server/env";
import { eq, inArray, sql } from "drizzle-orm";
import { createElement } from "react";

export class InvoiceError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Loads an invoice and locks its row for the rest of the transaction. */
async function lockInvoice(tx: Tx, id: string) {
  const [row] = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update");
  if (!row) throw new InvoiceError("Invoice not found");
  return row;
}

function ensure(action: InvoiceAction, inv: { status: "draft" | "confirmed" | "paid" | "cancelled"; total: number; amountPaid: number }) {
  const check = checkInvoiceAction(action, inv);
  if (!check.ok) throw new InvoiceError(check.reason);
}

export async function confirmInvoice(id: string) {
  await db.transaction(async (tx) => {
    const inv = await lockInvoice(tx, id);
    ensure("confirm", inv);
    await tx.update(invoices).set({ status: "confirmed" }).where(eq(invoices.id, id));
  });
}

export async function cancelInvoice(id: string) {
  await db.transaction(async (tx) => {
    const inv = await lockInvoice(tx, id);
    ensure("cancel", inv);
    await tx.update(invoices).set({ status: "cancelled" }).where(eq(invoices.id, id));
  });
}

export async function sendInvoice(id: string) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) throw new InvoiceError("Invoice not found");
  ensure("send", inv);
  await sendInvoiceEmails([id]);
}

export type PaymentInput = {
  invoiceId: string;
  amount: number;
  method: "bank" | "card" | "upi" | "cash" | "cheque";
  paidOn: string;
  note?: string | null;
  source?: "manual" | "bank_match" | "portal";
};

/** Records a payment (partial or full). The invoice becomes Paid once fully covered. */
export async function recordPayment(input: PaymentInput) {
  return db.transaction(async (tx) => {
    const inv = await lockInvoice(tx, input.invoiceId);
    const applied = applyPayment(inv, input.amount);
    if (!applied.ok) throw new InvoiceError(applied.reason, "amount");

    const [payment] = await tx
      .insert(payments)
      .values({ invoiceId: inv.id, amount: input.amount, method: input.method, paidOn: input.paidOn, note: input.note || null, source: input.source ?? "manual" })
      .returning({ id: payments.id });
    await tx.update(invoices).set({ amountPaid: applied.amountPaid, status: applied.status }).where(eq(invoices.id, inv.id));
    return { paymentId: payment.id, status: applied.status, balance: balance({ total: inv.total, amountPaid: applied.amountPaid }), number: inv.number };
  });
}

/** Emails invoices to their customers (a few at a time) and stamps when each was sent. Returns how many went out. */
export async function sendInvoiceEmails(ids: string[]) {
  const rows = await db
    .select({ inv: invoices, customer: customers })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(inArray(invoices.id, ids));
  const lines = await db.select().from(invoiceLines).where(inArray(invoiceLines.invoiceId, ids));

  const company = await getCompanyName();
  const sentIds: string[] = [];
  const queue = [...rows];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const { inv, customer } = next;
      const status = await sendEmail({
        to: customer.email,
        subject: `Invoice ${inv.number} from ${company} · ${money(inv.total)}`,
        template: "invoice",
        customerId: customer.id,
        element: createElement(InvoiceEmail, {
          customerName: customer.name,
          number: inv.number,
          period: `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`,
          lines: lines.filter((l) => l.invoiceId === inv.id && l.amount >= 0).map((l) => ({ description: l.description, qty: l.qty, amount: money(l.amount) })),
          subtotal: money(inv.subtotal),
          discount: inv.discountTotal ? money(inv.discountTotal) : null,
          tax: money(inv.taxTotal),
          total: money(inv.total),
          dueDate: formatDate(inv.dueDate),
          portalUrl: appUrl("/portal"),
        }),
      });
      if (status !== "failed") sentIds.push(inv.id);
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, rows.length) }, worker));
  // One update for every invoice that went out.
  if (sentIds.length) await db.update(invoices).set({ sentAt: sql`now()` }).where(inArray(invoices.id, sentIds));
  return sentIds.length;
}
