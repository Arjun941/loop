"use client";

import { Input } from "@/components/form/controls";
import { Field, FormError, SubmitButton } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { FormState } from "@/lib/validation/auth";
import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteStaff } from "./actions";

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Invite staff
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Invite a team member" description="They'll get an email to set their own password.">
        {/* A fresh key resets the form each time the sheet reopens. */}
        <InviteForm key={formKey} onDone={() => setFormKey((k) => k + 1)} />
      </Sheet>
    </>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteStaff, {});
  const [values, setValues] = useState({ name: "", email: "" });

  useEffect(() => {
    if (state.ok) toast.success("Invitation sent");
  }, [state.ok]);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">The invitation is on its way. The link signs them in to set a password.</p>
        <Button variant="secondary" onClick={onDone}>
          Invite someone else
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <Field label="Name" error={state.fieldErrors?.name}>
        <Input name="name" autoFocus value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} invalid={!!state.fieldErrors?.name} />
      </Field>
      <Field label="Work email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} invalid={!!state.fieldErrors?.email} />
      </Field>
      <SubmitButton pending={pending} className="mt-2">
        Send invitation
      </SubmitButton>
    </form>
  );
}
