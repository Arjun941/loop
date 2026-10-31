/**
 * Auth validation shared by the browser (live feedback) and the server (enforcement).
 * Keeping one definition guarantees the checklist a user sees is exactly what the server checks.
 */
import { z } from "zod";

export const PASSWORD_RULES = [
  { id: "length", need: "Use at least 9 characters", test: (v: string) => v.length > 8 },
  { id: "upper", need: "Add an uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", need: "Add a lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "special", need: "Add a symbol, like ! or #", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const PASSWORD_HINT = "At least 9 characters, with upper and lowercase letters and a symbol.";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const passwordSchema = z.string().superRefine((value, ctx) => {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  if (failed) ctx.addIssue({ code: "custom", message: `${failed.need}.` });
});

export const nameSchema = z.string().trim().min(2, "Enter your name").max(80);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  company: z.string().trim().max(120).optional(),
});

export const resetSchema = z.object({
  password: passwordSchema,
});

export const inviteSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

/** Shape every auth form action returns to its `useActionState` hook. */
export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** A follow-up step for the user, e.g. "confirm your email". */
  notice?: "confirm_email";
};

/** Converts a Zod error into one message per field, for inline display. */
export function fieldErrors(error: z.ZodError): FormState["fieldErrors"] {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
