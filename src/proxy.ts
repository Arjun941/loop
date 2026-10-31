/**
 * Runs before every page. Two jobs:
 *
 * 1. Keep the Supabase session fresh: tokens are refreshed here and written back as cookies,
 *    which Server Components can't do themselves.
 * 2. Send signed-out visitors straight to /login (remembering where they were going).
 *
 * This is an optimistic check for speed. Real authorization happens in `server/auth/access.ts`,
 * inside every query and action.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "./server/auth/constants";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Verifies the session and refreshes it if needed (writing new cookies via setAll above).
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;

  if (!data?.claims && !isPublicPath(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  // Skip static assets and Next internals.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
