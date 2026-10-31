"use client";

import { Input, PasswordInput } from "@/components/form/controls";
import { Field, FormError, SubmitButton } from "@/components/form/field";
import type { FormState } from "@/lib/validation/auth";
import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  // Controlled, so a failed attempt keeps the email (React resets uncontrolled fields after an action).
  const [email, setEmail] = useState("");

  // Carry `?next=` through sign-in without making the page depend on search params.
  function submit(form: FormData) {
    form.set("next", new URLSearchParams(window.location.search).get("next") ?? "");
    return action(form);
  }

  return (
    <form action={submit} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <Field label="Email" error={state.fieldErrors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!state.fieldErrors?.email}
        />
      </Field>
      <Field
        label="Password"
        error={state.fieldErrors?.password}
        aside={
          <Link href="/forgot" className="text-[13px] font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput name="password" autoComplete="current-password" invalid={!!state.fieldErrors?.password} />
      </Field>
      <SubmitButton pending={pending} className="mt-1">
        Sign in
      </SubmitButton>
    </form>
  );
}
