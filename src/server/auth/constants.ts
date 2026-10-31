/**
 * Auth constants shared with `proxy.ts`, so no database or server-only imports here.
 */

/** Routes reachable without signing in. `/reset` checks its own session (it's reached from an email link). */
export const PUBLIC_PATHS = ["/login", "/signup", "/forgot", "/reset", "/auth", "/api/mcp", "/api/cron"];

export function isPublicPath(pathname: string) {
  // "/" is the public landing page.
  return pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
