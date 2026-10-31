/**
 * GET /auth/callback — where Supabase sends people back after Google sign-in, email confirmation,
 * password reset and staff invites. It turns the one-time code into a session, makes sure the person
 * has a profile (first Google sign-in creates a customer account), then sends them on.
 */
import { createCustomerAccount, findProfile, landingFor } from "@/server/auth/accounts";
import { supabaseServer } from "@/server/auth/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next") ?? "";
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, request.url));

  if (params.get("error")) return fail(params.get("error_code") === "otp_expired" ? "link_expired" : "auth_failed");

  const supabase = await supabaseServer();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (params.get("type") ?? "email") as EmailOtpType })
      : { data: { user: null }, error: new Error("missing code") };
  if (error || !data.user) return fail(next.startsWith("/reset") ? "link_expired" : "auth_failed");

  const user = data.user;
  let profile = await findProfile(user.id);
  if (!profile && user.email) {
    // First sign-in with Google: create their customer account.
    const name = (user.user_metadata.full_name as string | undefined) ?? (user.user_metadata.name as string | undefined) ?? user.email.split("@")[0];
    await createCustomerAccount({ id: user.id, email: user.email.toLowerCase(), name });
    profile = await findProfile(user.id);
  }
  if (!profile) {
    await supabase.auth.signOut();
    return fail("auth_failed");
  }
  return NextResponse.redirect(new URL(landingFor(profile.role, next), request.url));
}
