/**
 * Account operations shared by every way of signing up (email and Google):
 * a Supabase login gets a profile, and customers also get a customer record.
 */
import "server-only";
import { db } from "@/server/db";
import { customers, profiles } from "@/server/db/schema";
import { getCompanyName } from "@/server/company";
import { sendEmail } from "@/server/email/send";
import { WelcomeEmail } from "@/server/email/templates/auth";
import { appUrl } from "@/server/env";
import { eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { createElement } from "react";
import { homeFor, type Role } from "./access";

export function findProfileByEmail(email: string) {
  return db
    .select()
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email.toLowerCase()}`)
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export function findProfile(id: string) {
  return db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/**
 * Creates the customer record and profile for a new Supabase user, then sends a welcome email
 * after the response (skipped with `welcome: false`, when a confirmation email goes instead).
 * Safe to call twice for the same user: it does nothing the second time.
 */
export async function createCustomerAccount(input: { id: string; email: string; name: string; company?: string | null; welcome?: boolean }) {
  const created = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, input.id));
    if (existing) return false;
    const [customer] = await tx
      .insert(customers)
      .values({ name: input.company || input.name, company: input.company || null, email: input.email })
      .returning({ id: customers.id });
    await tx.insert(profiles).values({ id: input.id, email: input.email, name: input.name, role: "customer", customerId: customer.id });
    return true;
  });

  if (created && input.welcome !== false) {
    after(async () =>
      sendEmail({
        to: input.email,
        subject: `Welcome to ${await getCompanyName()}`,
        template: "welcome",
        element: createElement(WelcomeEmail, { name: input.name, portalUrl: appUrl("/portal") }),
      }),
    );
  }
}

/** How long Supabase's one-time email links last (Auth → Email OTP expiration, 1 hour by default). */
export const LINK_MINUTES = 60;

/**
 * A link for emails we send ourselves (password reset, staff invite). It carries the hashed token from
 * `auth.admin.generateLink`, which /auth/callback verifies on the server, so it works in any browser.
 */
export function authLinkUrl(hashedToken: string, type: "signup" | "recovery" | "invite", next: string) {
  const params = new URLSearchParams({ token_hash: hashedToken, type, next });
  return appUrl(`/auth/callback?${params}`);
}

/**
 * `next` as a path on this site, or null. Browsers read `/\evil.com` or `/\t/evil.com` as another
 * site, so rather than pattern-match we resolve it the way a browser would and keep it only if it
 * stays on our origin.
 */
function safePath(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/")) return null;
  const base = "https://loop.invalid";
  try {
    const url = new URL(next, base);
    return url.origin === base ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}

/**
 * Where to send a user after signing in: their requested page if it's safe and theirs, else their home.
 * `/reset` is allowed for everyone, since recovery and invite links finish there.
 */
export function landingFor(role: Role, next: unknown) {
  const value = safePath(next);
  if (!value) return homeFor(role);
  if (value === "/reset" || value.startsWith("/reset?")) return value;
  const isPortal = value === "/portal" || value.startsWith("/portal/");
  if ((role === "customer") !== isPortal) return homeFor(role);
  return value;
}
