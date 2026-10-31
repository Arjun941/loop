"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { Input } from "@/components/form/controls";
import { Field, FormError, SubmitButton } from "@/components/form/field";
import type { FormState } from "@/lib/validation/auth";
import { MailCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { requestPasswordReset } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});
  const [email, setEmail] = useState("");
  const footer = (
    <Link href="/login" className="font-medium text-accent hover:underline">
      Back to sign in
    </Link>
  );

  if (state.ok) {
    return (
      <AuthForm
        title="Check your email"
        subtitle={
          <>
            If <span className="text-fg">{email}</span> has an account, a reset link is on its way. It works once and
            expires in an hour.
          </>
        }
        footer={footer}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
          className="grid size-14 place-items-center rounded-2xl bg-success-soft text-success"
        >
          <MailCheck className="size-7" />
        </motion.div>
      </AuthForm>
    );
  }

  return (
    <AuthForm title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new one." footer={footer}>
      <form action={action} className="flex flex-col gap-5" noValidate>
        <FormError message={state.error} />
        <Field label="Email" error={state.fieldErrors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!state.fieldErrors?.email}
          />
        </Field>
        <SubmitButton pending={pending} className="mt-1">
          Send reset link
        </SubmitButton>
      </form>
    </AuthForm>
  );
}
