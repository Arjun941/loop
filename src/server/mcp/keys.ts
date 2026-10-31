/**
 * API keys for the MCP server.
 * Keys look like `loop_sk_…`; only their SHA-256 hash is stored, so a database leak can't be replayed.
 */
import "server-only";
import type { CurrentUser } from "@/server/auth/access";
import { db } from "@/server/db";
import { apiKeys, profiles } from "@/server/db/schema";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

/** Creates a key and returns it in full. This is the only time it's visible. */
export async function createApiKey(profileId: string, name: string) {
  const key = `loop_sk_${randomBytes(24).toString("base64url")}`;
  await db.insert(apiKeys).values({ name, prefix: key.slice(0, 14), keyHash: hash(key), profileId });
  return key;
}

export function listApiKeys() {
  return db
    .select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt, lastUsedAt: apiKeys.lastUsedAt, owner: profiles.name })
    .from(apiKeys)
    .innerJoin(profiles, eq(profiles.id, apiKeys.profileId))
    .where(isNull(apiKeys.revokedAt))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(id: string) {
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
}

/** The user a key acts as, or null if it's unknown or revoked. */
export async function verifyApiKey(key: string): Promise<(CurrentUser & { keyId: string }) | null> {
  if (!key.startsWith("loop_sk_")) return null;
  const [row] = await db
    .select({ keyId: apiKeys.id, id: profiles.id, email: profiles.email, name: profiles.name, role: profiles.role, customerId: profiles.customerId })
    .from(apiKeys)
    .innerJoin(profiles, eq(profiles.id, apiKeys.profileId))
    .where(and(eq(apiKeys.keyHash, hash(key)), isNull(apiKeys.revokedAt)));
  if (!row || row.role === "customer") return null;

  // Record use at most once a minute, so busy clients don't write on every call.
  const minuteAgo = new Date(Date.now() - 60_000);
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(apiKeys.id, row.keyId), or(isNull(apiKeys.lastUsedAt), lt(apiKeys.lastUsedAt, minuteAgo))));
  return row;
}
