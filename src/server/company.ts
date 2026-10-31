/**
 * The business using Loop, as set in company settings. Used wherever customers see who's
 * billing them: email subjects and headers, printed invoices.
 */
import "server-only";
import { db } from "@/server/db";
import { companySettings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const getCompanyName = cache(async () => {
  const [row] = await db.select({ name: companySettings.name }).from(companySettings).where(eq(companySettings.id, 1));
  return row?.name?.trim() || "Loop";
});
