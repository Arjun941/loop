"use server";
/**
 * Inviting staff. Only an admin can do this. We email the invitation ourselves; the link signs the
 * new member in and takes them to set their own password.
 */
import { fieldErrors, inviteSchema, type FormState } from "@/lib/validation/auth";
import { requireAdmin } from "@/server/auth/access";
import { authLinkUrl, findProfileByEmail } from "@/server/auth/accounts";
import { supabaseAdmin } from "@/server/auth/supabase";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { sendEmail } from "@/server/email/send";
import { StaffInviteEmail } from "@/server/email/templates/auth";
import { revalidatePath } from "next/cache";
import { createElement } from "react";

export async function inviteStaff(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email } = parsed.data;

  if (await findProfileByEmail(email)) return { fieldErrors: { email: "Someone already uses this email." } };

  // Creates the login and a one-time link; we send the email ourselves.
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "invite", email, options: { data: { name } } });
  if (error) {
    if (error.code === "email_exists") return { fieldErrors: { email: "Someone already uses this email." } };
    return { error: error.message };
  }

  await db.insert(profiles).values({ id: data.user.id, email, name, role: "staff" });
  await sendEmail({
    to: email,
    subject: `${admin.name} invited you to Loop`,
    template: "staff-invite",
    element: createElement(StaffInviteEmail, {
      name,
      inviter: admin.name,
      inviteUrl: authLinkUrl(data.properties.hashed_token, "invite", "/reset?invite=1"),
    }),
  });
  revalidatePath("/settings/team");
  return { ok: true };
}
