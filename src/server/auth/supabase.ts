/**
 * Supabase clients for server code.
 *
 * - `supabaseServer()` acts as the signed-in user, reading and refreshing the session cookie.
 * - `supabaseAdmin()` uses the secret key for privileged auth tasks (inviting staff, seeding).
 *   It must never reach the browser.
 */
import "server-only";
import { env } from "@/server/env";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; the proxy refreshes the session on the next request.
        }
      },
    },
  });
}

export function supabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type AuthSettings = { external?: Record<string, boolean>; mailer_autoconfirm?: boolean };

/** The project's public auth settings, as switched in the Supabase dashboard. */
async function authSettings(): Promise<AuthSettings> {
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabasePublishableKey } });
    return (await res.json()) as AuthSettings;
  } catch {
    return {};
  }
}

/** Whether an OAuth provider is switched on in the Supabase dashboard. */
export async function providerEnabled(provider: "google") {
  return (await authSettings()).external?.[provider] === true;
}

/** Whether new sign-ups must confirm their email (Authentication → Sign In / Providers → Confirm email). */
export async function emailConfirmationRequired() {
  return (await authSettings()).mailer_autoconfirm !== true;
}
