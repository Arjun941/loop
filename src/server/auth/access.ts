/**
 * The access layer. Every server query and action starts by calling one of these,
 * so permissions are enforced on the server no matter what the UI shows.
 *
 *   admin    → everything
 *   staff    → day-to-day work; no catalog, taxes, discounts or team management
 *   customer → only their own subscriptions and invoices, via /portal
 */
import "server-only";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { supabaseServer } from "./supabase";

export type Role = "admin" | "staff" | "customer";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  customerId: string | null;
};

/** The Supabase user id from the verified session cookie, or null. */
export async function getSessionUserId(): Promise<string | null> {
  // Sessions depend on the request and the current time, so never prerender them.
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/**
 * Lets non-browser callers (the MCP server, authenticated by API key) act as a specific user.
 * Inside `runAsUser`, every access check sees that user, so permissions are identical to the web app.
 */
const actor = new AsyncLocalStorage<CurrentUser>();

export function runAsUser<T>(user: CurrentUser, fn: () => Promise<T>) {
  return actor.run(user, fn);
}

/** The signed-in user's profile, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const acting = actor.getStore();
  if (acting) return acting;
  const userId = await getSessionUserId();
  if (!userId) return null;
  const [profile] = await db
    .select({ id: profiles.id, email: profiles.email, name: profiles.name, role: profiles.role, customerId: profiles.customerId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return profile ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Admin or staff. Customers are sent to their portal instead. */
export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === "customer") redirect("/portal");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireStaff();
  if (user.role !== "admin") throw new Error("Only an admin can do this.");
  return user;
}

/** A customer with a linked customer record. Staff are sent to the back office. */
export async function requireCustomer(): Promise<CurrentUser & { customerId: string }> {
  const user = await requireUser();
  if (user.role !== "customer" || !user.customerId) redirect("/");
  return user as CurrentUser & { customerId: string };
}

/** Where a user lands after signing in. */
export function homeFor(role: Role) {
  return role === "customer" ? "/portal" : "/dashboard";
}
