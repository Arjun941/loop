/**
 * GET /api/cron/daily — the nightly job: bill everything due today, then send reminders.
 *
 * Scheduled by `vercel.json`. Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 * Safe to call more than once a day: billing never bills twice and each reminder stage goes out once.
 */
import { today } from "@/lib/dates";
import { runBilling } from "@/server/services/billing";
import { sendReminders } from "@/server/services/reminders";
import { NextResponse, type NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

/** Compares secrets in constant time (hashing first makes the lengths equal). */
function sameSecret(a: string, b: string) {
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(a), hash(b));
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = today();
  const billing = await runBilling(date, { actorId: null, send: true });
  const reminders = await sendReminders(date);
  return NextResponse.json({ date, billing: { created: billing.created, skipped: billing.skipped, closed: billing.closed, emailed: billing.emailed }, reminders });
}
