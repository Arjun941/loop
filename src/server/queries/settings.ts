/**
 * Settings data: company profile, team members and the email log (Outbox).
 */
import "server-only";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import { companySettings, emailLog, profiles } from "@/server/db/schema";
import { emailProviderConfigured, SECRET_TEMPLATES } from "@/server/email/send";
import { count, desc, eq, inArray } from "drizzle-orm";

export async function getCompany() {
  await requireStaff();
  const [company] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
  return { ...company, emailProvider: emailProviderConfigured() ? "Resend" : null };
}

export async function listTeam() {
  const viewer = await requireStaff();
  const members = await db
    .select({ id: profiles.id, name: profiles.name, email: profiles.email, role: profiles.role, createdAt: profiles.createdAt })
    .from(profiles)
    .where(inArray(profiles.role, ["admin", "staff"]))
    .orderBy(profiles.role, profiles.name);
  return { members, canInvite: viewer.role === "admin", viewerId: viewer.id };
}

export const EMAILS_PAGE_SIZE = 25;

export async function listEmails(page = 1) {
  await requireStaff();
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: emailLog.id,
        to: emailLog.to,
        subject: emailLog.subject,
        template: emailLog.template,
        status: emailLog.status,
        createdAt: emailLog.createdAt,
      })
      .from(emailLog)
      .orderBy(desc(emailLog.createdAt))
      .limit(EMAILS_PAGE_SIZE)
      .offset((page - 1) * EMAILS_PAGE_SIZE),
    db.select({ total: count() }).from(emailLog),
  ]);
  return { rows, total };
}

/** One email's HTML for the Outbox preview. Emails with a sign-in link are never shown (see SECRET_TEMPLATES). */
export async function getEmailHtml(id: string): Promise<{ html: string } | { hidden: true } | null> {
  await requireStaff();
  const [row] = await db.select({ html: emailLog.html, template: emailLog.template }).from(emailLog).where(eq(emailLog.id, id));
  if (!row) return null;
  if (SECRET_TEMPLATES.has(row.template) || !row.html) return { hidden: true };
  return { html: row.html };
}
