/**
 * The one way the app sends email.
 *
 * Renders a React Email template, delivers it through Resend when `RESEND_API_KEY` is set,
 * and always records it in `email_log`, which powers the in-app Outbox and customer timelines.
 * Delivery failures are logged, never thrown: a flaky provider must not break sign-up or billing.
 *
 * Emails that carry a sign-in link (password reset, invite, email confirmation) are logged without
 * their body: anyone who could read the link could sign in as the recipient.
 */
import "server-only";
import { db } from "@/server/db";
import { emailLog } from "@/server/db/schema";
import { env } from "@/server/env";
import { render } from "@react-email/render";
import { getCompanyName } from "@/server/company";
import { withCompany } from "./templates/company";
import type { ReactElement } from "react";
import { Resend } from "resend";

export type EmailStatus = "sent" | "outbox" | "failed";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

/** Templates whose body holds a one-time sign-in link. Never stored or shown in the Outbox. */
export const SECRET_TEMPLATES = new Set(["password-reset", "staff-invite", "confirm-email"]);

export function emailProviderConfigured() {
  return resend !== null;
}

export async function sendEmail({
  to,
  subject,
  template,
  element,
  customerId,
}: {
  to: string;
  subject: string;
  /** Short identifier shown in the Outbox, e.g. "password-reset". */
  template: string;
  element: ReactElement;
  customerId?: string | null;
}): Promise<EmailStatus> {
  // Templates read the sender's name while rendering, so it always matches company settings.
  const [html, text] = await withCompany(await getCompanyName(), () => Promise.all([render(element), render(element, { plainText: true })]));

  let status: EmailStatus = "outbox";
  let providerId: string | null = null;

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({ from: env.emailFrom, to, subject, html, text });
      status = error ? "failed" : "sent";
      providerId = data?.id ?? null;
      if (error) console.error(`[email] ${template} to ${to} failed:`, error.message);
    } catch (err) {
      status = "failed";
      console.error(`[email] ${template} to ${to} failed:`, err);
    }
  }

  const secret = SECRET_TEMPLATES.has(template);
  // Without a provider a sign-in link can't reach anyone, so in development print it to the server log instead.
  if (secret && status !== "sent" && process.env.NODE_ENV !== "production") {
    console.info(`[email] ${template} for ${to} was not delivered. Its text, for local testing:\n${text}`);
  }
  await db.insert(emailLog).values({ to, subject, template, html: secret ? null : html, status, providerId, customerId: customerId ?? null });
  return status;
}
