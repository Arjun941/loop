"use client";
/**
 * Two-step sign-up: credentials first (with live password guidance), then who you are.
 * Values live in state so moving between steps never loses what was typed.
 */
import { AuthForm, OrDivider } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordStrength, passwordMeetsRules } from "@/components/auth/password-strength";
import { Input, PasswordInput } from "@/components/form/controls";
import { Field, FormError, SubmitButton } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { emailSchema, type FormState } from "@/lib/validation/auth";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp } from "../actions";

type Step = 0 | 1;

const slide = {
  enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -24, opacity: 0 }),
};

export function SignupForm() {
  const [values, setValues] = useState({ email: "", password: "", name: "", company: "" });
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [localErrors, setLocalErrors] = useState<FormState["fieldErrors"]>({});
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await signUp(prev, form);
    // Credential problems are fixed on the first step, so take the user back there.
    if (result.fieldErrors?.email || result.fieldErrors?.password) go(0);
    return result;
  }, {});

  const errors = { ...state.fieldErrors, ...localErrors };
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setLocalErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  function go(next: Step) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function continueToDetails(e: React.FormEvent) {
    e.preventDefault();
    const email = emailSchema.safeParse(values.email);
    const nextErrors = {
      email: email.success ? undefined : email.error.issues[0].message,
      password: passwordMeetsRules(values.password) ? undefined : "Finish the password requirements to continue.",
    };
    setLocalErrors(nextErrors);
    if (!nextErrors.email && !nextErrors.password) go(1);
  }

  if (state.notice === "confirm_email") {
    return (
      <AuthForm
        title="Confirm your email"
        subtitle={
          <>
            We sent a link to <span className="text-fg">{values.email}</span>. Open it to finish creating your account.
          </>
        }
        footer={
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        }
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
          className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"
        >
          <MailCheck className="size-7" />
        </motion.div>
      </AuthForm>
    );
  }

  return (
    <AuthForm
      title={step === 0 ? "Create your account" : "A little about you"}
      subtitle={step === 0 ? "See and manage your subscriptions without emailing anyone." : "Your name and company appear on your invoices."}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Progress step={step} />
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        {step === 0 ? (
          <motion.div
            key="credentials"
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <GoogleButton label="Sign up with Google" />
            <OrDivider />
            <form onSubmit={continueToDetails} className="flex flex-col gap-5" noValidate>
              <Field label="Work email" error={errors.email}>
                <Input type="email" autoComplete="email" placeholder="you@company.com" value={values.email} onChange={set("email")} invalid={!!errors.email} />
              </Field>
              <Field label="Password" error={errors.password}>
                <PasswordInput autoComplete="new-password" value={values.password} onChange={set("password")} invalid={!!errors.password} />
                <PasswordStrength value={values.password} />
              </Field>
              <Button type="submit" size="lg" className="mt-1 h-11 w-full rounded-xl">
                Continue
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.form
            key="details"
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            action={action}
            className="flex flex-col gap-5"
            noValidate
          >
            <input type="hidden" name="email" value={values.email} />
            <input type="hidden" name="password" value={values.password} />
            <FormError message={state.error} />
            <Field label="Full name" error={errors.name}>
              <Input name="name" autoComplete="name" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
            </Field>
            <Field label="Company" hint="Optional. Leave blank if you're buying for yourself." error={errors.company}>
              <Input name="company" autoComplete="organization" value={values.company} onChange={set("company")} />
            </Field>
            <div className="mt-1 flex gap-2.5">
              <Button type="button" variant="secondary" size="lg" onClick={() => go(0)} aria-label="Back" className="h-11 rounded-xl border border-field-border shadow-none">
                <ArrowLeft className="size-4" />
              </Button>
              <SubmitButton pending={pending} className="flex-1">
                Create account
              </SubmitButton>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthForm>
  );
}

function Progress({ step }: { step: Step }) {
  return (
    <div className="mb-7" aria-label={`Step ${step + 1} of 2`}>
      <div className="mb-2 text-[12px] font-medium text-muted">Step {step + 1} of 2</div>
      <div className="flex gap-1.5">
        {[0, 1].map((i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-soft">
            <motion.div
              className="h-full bg-accent"
              initial={false}
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ type: "spring", stiffness: 260, damping: 32 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
