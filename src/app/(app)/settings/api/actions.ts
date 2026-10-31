"use server";
/**
 * API key management for the MCP server. Admins only.
 */
import { requireStaff } from "@/server/auth/access";
import { createApiKey, revokeApiKey } from "@/server/mcp/keys";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createApiKeyAction(name: string): Promise<{ key: string } | { error: string }> {
  const user = await requireStaff();
  if (user.role !== "admin") return { error: "Only an admin can create API keys." };
  const parsed = z.string().trim().min(2, "Give the key a name").max(60).safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const key = await createApiKey(user.id, parsed.data);
  revalidatePath("/settings/api");
  return { key };
}

export async function revokeApiKeyAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (user.role !== "admin") return { ok: false, error: "Only an admin can revoke API keys." };
  await revokeApiKey(id);
  revalidatePath("/settings/api");
  return { ok: true };
}
