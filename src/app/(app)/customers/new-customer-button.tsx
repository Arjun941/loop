"use client";
/**
 * "New customer" on the Customers page: a sheet with the customer's billing details.
 * Uses the same server action as the customer picker, so the rules (and duplicate-email check) match.
 */
import { createCustomer } from "@/app/(app)/subscriptions/actions";
import { Input, Textarea } from "@/components/form/controls";
import { Field, FormError, SubmitButton } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const EMPTY = { name: "", email: "", company: "", phone: "", address: "" };

export function NewCustomerButton() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function close() {
    setOpen(false);
    setFormKey((k) => k + 1); // a fresh form next time
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={2.2} /> New customer
      </Button>
      <Sheet open={open} onClose={close} title="New customer" description="Who you bill. Invoices and reminders go to this email.">
        <NewCustomerForm key={formKey} onCreated={close} />
      </Sheet>
    </>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<{ error?: string; fieldErrors?: Partial<Record<string, string>> }>({});
  const [pending, start] = useTransition();
  // Editing a field clears its error, so a fixed field stops showing red straight away.
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, fieldErrors: { ...prev.fieldErrors, [key]: undefined } }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await createCustomer(values);
      if (!result.customer) {
        setErrors({ error: result.error, fieldErrors: result.fieldErrors });
        return;
      }
      toast.success(`${result.customer.name} added`);
      onCreated();
      router.refresh();
    });
  }

  const fe = errors.fieldErrors ?? {};
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormError message={errors.error} />
      <Field label="Name" error={fe.name}>
        <Input autoFocus placeholder="Company or person" value={values.name} onChange={set("name")} invalid={!!fe.name} />
      </Field>
      <Field label="Billing email" error={fe.email}>
        <Input type="email" placeholder="billing@company.com" value={values.email} onChange={set("email")} invalid={!!fe.email} />
      </Field>
      <Field label="Company" hint="Optional. Shown on invoices if different from the name." error={fe.company}>
        <Input value={values.company} onChange={set("company")} invalid={!!fe.company} />
      </Field>
      <Field label="Phone" hint="Optional." error={fe.phone}>
        <Input type="tel" value={values.phone} onChange={set("phone")} invalid={!!fe.phone} />
      </Field>
      <Field label="Billing address" hint="Optional. Printed on invoices." error={fe.address}>
        <Textarea rows={3} value={values.address} onChange={set("address")} invalid={!!fe.address} />
      </Field>
      <SubmitButton pending={pending} className="mt-2">
        Add customer
      </SubmitButton>
    </form>
  );
}
