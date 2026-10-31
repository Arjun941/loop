"use client";
/**
 * Record a payment against an open invoice. The amount defaults to what's still owed;
 * a smaller amount is recorded as a partial payment.
 */
import { recordPaymentAction } from "@/app/(app)/invoices/actions";
import { SheetFooter } from "@/components/catalog/sheet-footer";
import { AffixInput, Input, Segmented, Textarea } from "@/components/form/controls";
import { Field, FormError } from "@/components/form/field";
import { useSaveAction } from "@/components/form/use-save-action";
import { today } from "@/lib/dates";
import { money } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/lib/validation/payment";
import { useState } from "react";
import { InvoicePicker, type PickedInvoice } from "./invoice-picker";

type Method = (typeof PAYMENT_METHODS)[number];

export function PaymentForm({ invoice, onDone }: { invoice?: PickedInvoice; onDone: () => void }) {
  const { state, action, pending, errors, onChange } = useSaveAction(recordPaymentAction, { success: "Payment recorded", onSuccess: onDone });
  const [picked, setPicked] = useState<PickedInvoice | null>(invoice ?? null);
  const [amount, setAmount] = useState(invoice ? String(invoice.balance / 100) : "");
  const [method, setMethod] = useState<Method>("bank");

  const typed = Math.round((Number(amount.replace(/[,₹\s]/g, "")) || 0) * 100);
  const remaining = picked ? picked.balance - typed : 0;

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-6" noValidate>
      <FormError message={state.error} />
      <Field label="Invoice" error={errors.invoiceId}>
        {invoice ? (
          <>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <div className="rounded-xl bg-neutral-soft px-3.5 py-2.5 text-[14px]">
              <span className="font-medium tabular">{invoice.number}</span>
              <span className="text-muted"> · {invoice.customer}</span>
            </div>
          </>
        ) : (
          <InvoicePicker
            name="invoiceId"
            value={picked}
            invalid={!!errors.invoiceId}
            onChange={(inv) => {
              setPicked(inv);
              setAmount(String(inv.balance / 100));
            }}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Amount"
          error={errors.amount}
          hint={picked && typed > 0 && remaining > 0 ? `Partial: ${money(remaining)} will remain` : picked && remaining === 0 && typed > 0 ? "Pays the invoice in full" : undefined}
        >
          <AffixInput name="amount" prefix="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errors.amount} />
        </Field>
        <Field label="Date received" error={errors.paidOn}>
          <Input name="paidOn" type="date" max={today()} defaultValue={today()} invalid={!!errors.paidOn} />
        </Field>
      </div>

      <Field label="Method">
        <Segmented name="method" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m === "bank" ? "Bank" : PAYMENT_METHOD_LABEL[m] }))} />
      </Field>

      <Field label="Note" hint="Optional, e.g. a UTR or cheque number">
        <Textarea name="note" placeholder="Reference" className="min-h-[72px]" />
      </Field>

      <SheetFooter pending={pending} saveLabel="Record payment" />
    </form>
  );
}
