"use server";

import { getEmailHtml } from "@/server/queries/settings";

/** Fetches one email's HTML for the preview sheet. */
export async function loadEmailPreview(id: string) {
  return getEmailHtml(id);
}
