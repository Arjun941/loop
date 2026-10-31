"use server";
/**
 * Invoice and payment actions for staff and admins.
 */
import type { InvoiceAction } from "@/lib/domain/invoice-status";
import { fieldErrors, type FormState } from "@/lib/validation/auth";
import { paymentSchema } from "@/lib/validation/payment";
import { today } from "@/lib/dates";
import { requireStaff } from "@/server/auth/access";
import { searchOpenInvoices } from "@/server/queries/invoices";
import { cancelInvoice, confirmInvoice, InvoiceError, recordPayment, sendInvoice } from "@/server/services/invoices";
import { revalidatePath } from "next/cache";

function refresh(id?: string) {
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/invoices/${id}`);
}

export async function invoiceAction(id: string, action: Exclude<InvoiceAction, "record_payment">): Promise<FormState> {
  await requireStaff();
  try {
    if (action === "confirm") await confirmInvoice(id);
    else if (action === "cancel") await cancelInvoice(id);
    else await sendInvoice(id);
  } catch (err) {
    if (err instanceof InvoiceError) return { error: err.message };
    throw err;
  }
  refresh(id);
  return { ok: true };
}

export async function recordPaymentAction(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = paymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.paidOn > today()) return { fieldErrors: { paidOn: "A payment can't be in the future" } };
  try {
    await recordPayment({ ...parsed.data, source: "manual" });
  } catch (err) {
    if (err instanceof InvoiceError) return err.field ? { fieldErrors: { [err.field]: err.message } } : { error: err.message };
    throw err;
  }
  refresh(parsed.data.invoiceId);
  return { ok: true };
}

export async function findOpenInvoices(q: string) {
  return searchOpenInvoices(q);
}
