/**
 * Invoice lifecycle and payment rules.
 *
 *   Draft → Confirmed → Paid          (Draft or Confirmed → Cancelled, while nothing is paid)
 *
 * Pure and shared: the invoice page uses it to decide which buttons to show,
 * the server uses it to enforce.
 */

export type InvoiceStatus = "draft" | "confirmed" | "paid" | "cancelled";
export type InvoiceAction = "confirm" | "cancel" | "send" | "record_payment";

type InvoiceState = { status: InvoiceStatus; total: number; amountPaid: number };

export function balance(inv: Pick<InvoiceState, "total" | "amountPaid">) {
  return Math.max(0, inv.total - inv.amountPaid);
}

/** Overdue: confirmed, past its due date, with money still owed. */
export function isOverdue(inv: InvoiceState & { dueDate: string }, today: string) {
  return inv.status === "confirmed" && inv.dueDate < today && balance(inv) > 0;
}

export function daysOverdue(dueDate: string, today: string) {
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(dueDate)) / 86_400_000));
}

export function checkInvoiceAction(action: InvoiceAction, inv: InvoiceState): { ok: true } | { ok: false; reason: string } {
  switch (action) {
    case "confirm":
      return inv.status === "draft" ? { ok: true } : { ok: false, reason: "Only drafts can be confirmed" };
    case "cancel":
      if (inv.status !== "draft" && inv.status !== "confirmed") return { ok: false, reason: `A ${inv.status} invoice can't be cancelled` };
      if (inv.amountPaid > 0) return { ok: false, reason: "It has payments recorded against it" };
      return { ok: true };
    case "send":
      return inv.status === "confirmed" || inv.status === "paid" ? { ok: true } : { ok: false, reason: "Confirm the invoice before sending it" };
    case "record_payment":
      if (inv.status !== "confirmed") return { ok: false, reason: inv.status === "paid" ? "This invoice is already paid" : "Confirm the invoice first" };
      return balance(inv) > 0 ? { ok: true } : { ok: false, reason: "Nothing left to pay" };
  }
}

export function availableInvoiceActions(inv: InvoiceState): InvoiceAction[] {
  return (["confirm", "send", "record_payment", "cancel"] as const).filter((a) => checkInvoiceAction(a, inv).ok);
}

/**
 * Applies a payment. It may be partial; it can't exceed what's owed.
 * Returns the new amount paid and status (Paid once fully covered).
 */
export function applyPayment(inv: InvoiceState, amount: number): { ok: true; amountPaid: number; status: InvoiceStatus } | { ok: false; reason: string } {
  const allowed = checkInvoiceAction("record_payment", inv);
  if (!allowed.ok) return allowed;
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: "Enter an amount above zero" };
  if (amount > balance(inv)) return { ok: false, reason: "That's more than the amount due" };
  const amountPaid = inv.amountPaid + amount;
  return { ok: true, amountPaid, status: amountPaid >= inv.total ? "paid" : "confirmed" };
}
