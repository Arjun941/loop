"use server";
/**
 * Server actions for the sign-in flows, backed by Supabase Auth.
 * Each validates with the shared Zod schemas, so the rules shown in the browser are the rules enforced here.
 */
import { emailSchema, fieldErrors, loginSchema, resetSchema, signupSchema, type FormState } from "@/lib/validation/auth";
import { getCurrentUser, homeFor } from "@/server/auth/access";
import { authLinkUrl, createCustomerAccount, findProfile, findProfileByEmail, landingFor, LINK_MINUTES } from "@/server/auth/accounts";
import { emailConfirmationRequired, supabaseAdmin, supabaseServer } from "@/server/auth/supabase";
import { getCompanyName } from "@/server/company";
import { sendEmail } from "@/server/email/send";
import { ConfirmEmail, PasswordResetEmail } from "@/server/email/templates/auth";
import { redirect } from "next/navigation";
import { createElement } from "react";

const EMAIL_TAKEN: FormState = { fieldErrors: { email: "An account with this email already exists. Try signing in." } };

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, name, company } = parsed.data;

  if (await findProfileByEmail(email)) return EMAIL_TAKEN;

  if (await emailConfirmationRequired()) {
    // Supabase creates the login and a one-time confirmation link; we send the email ourselves, since
    // Supabase's built-in mailer only delivers to members of the Supabase team.
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "signup", email, password, options: { data: { name } } });
    if (error) return signUpError(error);
    await createCustomerAccount({ id: data.user.id, email, name, company, welcome: false });
    await sendEmail({
      to: email,
      subject: `Confirm your email for ${await getCompanyName()}`,
      template: "confirm-email",
      element: createElement(ConfirmEmail, { name, confirmUrl: authLinkUrl(data.properties.hashed_token, "signup", "/portal") }),
    });
    return { ok: true, notice: "confirm_email" };
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) return signUpError(error);
  if (!data.user) return { error: "Something went wrong. Please try again." };
  await createCustomerAccount({ id: data.user.id, email, name, company });
  redirect("/portal");
}

function signUpError(error: { code?: string; message: string }): FormState {
  if (error.code === "user_already_exists" || error.code === "email_exists") return EMAIL_TAKEN;
  if (error.code === "weak_password") return { fieldErrors: { password: error.message } };
  if (error.code === "email_address_invalid") return { fieldErrors: { email: "Use an email address that can receive mail." } };
  return { error: error.message };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirm your email first. The link is in your inbox." };
    return { error: "That email and password don't match." };
  }

  const profile = await findProfile(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This login isn't linked to an account yet." };
  }
  redirect(landingFor(profile.role, form.get("next")));
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };

  // The same response whether or not the account exists, so this can't be used to probe for emails.
  const profile = await findProfileByEmail(parsed.data);
  if (!profile) return { ok: true };

  // Supabase makes the one-time link; we send it ourselves, so it works in any browser and isn't
  // held back by Supabase's built-in mailer.
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email: profile.email });
  if (error) {
    console.error("[auth] recovery link failed:", error.message);
    return { ok: true };
  }
  await sendEmail({
    to: profile.email,
    subject: `Reset your ${await getCompanyName()} password`,
    template: "password-reset",
    element: createElement(PasswordResetEmail, {
      name: profile.name,
      resetUrl: authLinkUrl(data.properties.hashed_token, "recovery", "/reset"),
      minutes: LINK_MINUTES,
    }),
    customerId: profile.customerId,
  });
  return { ok: true };
}

/** Sets a new password for the signed-in user (they arrive here from a reset or invite link). */
export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const user = await getCurrentUser();
  if (!user) return { error: "This link has expired. Request a new one." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you haven't used before." } };
    return { error: error.message };
  }
  // Sign out every other device, keep this one.
  await supabase.auth.signOut({ scope: "others" });
  redirect(homeFor(user.role));
}
