"use client";

import { PasswordStrength } from "@/components/auth/password-strength";
import { PasswordInput } from "@/components/form/controls";
import { Field, FormError, SubmitButton } from "@/components/form/field";
import type { FormState } from "@/lib/validation/auth";
import { useActionState, useState } from "react";
import { resetPassword } from "../actions";

export function ResetForm({ submitLabel }: { submitLabel: string }) {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <Field label="New password" error={state.fieldErrors?.password}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!state.fieldErrors?.password}
        />
        <PasswordStrength value={password} />
      </Field>
      <SubmitButton pending={pending} className="mt-1">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
