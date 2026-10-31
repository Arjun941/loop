/**
 * Which billing periods a subscription owes on a given day.
 *
 * Pure, so the Billing Day preview and the real run agree exactly. A subscription that missed
 * runs catches up period by period; billing stops at the expiry date.
 */
import { addDays, addPeriod, type Period } from "../dates";

export type BillingPeriod = { start: string; end: string };

export type DuePeriods = {
  periods: BillingPeriod[];
  /** Where billing continues next time; null once the subscription has reached its expiry. */
  nextInvoiceDate: string | null;
  /** True when these periods take the subscription to its expiry date. */
  reachesExpiry: boolean;
};

/** A safety cap so one neglected subscription can't create hundreds of invoices in a single run. */
export const MAX_CATCH_UP_PERIODS = 24;

export function duePeriods(
  sub: { nextInvoiceDate: string | null; expiryDate: string | null; period: Period; intervalCount?: number },
  asOf: string,
): DuePeriods {
  const periods: BillingPeriod[] = [];
  let start = sub.nextInvoiceDate;
  const count = sub.intervalCount ?? 1;

  while (start && start <= asOf && (!sub.expiryDate || start < sub.expiryDate) && periods.length < MAX_CATCH_UP_PERIODS) {
    const next = addPeriod(start, sub.period, count);
    // The last period ends the day before expiry (no proration: it's billed in full).
    const end = sub.expiryDate && next > sub.expiryDate ? addDays(sub.expiryDate, -1) : addDays(next, -1);
    periods.push({ start, end });
    start = next;
  }

  const reachesExpiry = !!sub.expiryDate && !!start && start >= sub.expiryDate;
  return { periods, nextInvoiceDate: reachesExpiry ? null : start, reachesExpiry };
}

/** Invoice numbers run per year: INV-2026-000123. */
export function invoiceNumber(year: string, sequence: number) {
  return `INV-${year}-${String(sequence).padStart(6, "0")}`;
}
