/**
 * GET /auth/google — starts "Continue with Google" through Supabase Auth.
 * If the Google provider isn't switched on in Supabase, explain that instead of showing Supabase's error page.
 */
import { providerEnabled, supabaseServer } from "@/server/auth/supabase";
import { appUrl } from "@/server/env";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  if (!(await providerEnabled("google"))) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", request.url));
  }

  const next = request.nextUrl.searchParams.get("next") ?? "";
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  return NextResponse.redirect(data.url);
}
