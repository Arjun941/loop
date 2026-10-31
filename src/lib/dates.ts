// Calendar dates are handled as ISO strings (YYYY-MM-DD) to avoid timezone drift.

export type Period = "daily" | "weekly" | "monthly" | "yearly";

export function today(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

// Month arithmetic clamps to the last day, so Jan 31 + 1 month = Feb 28/29.
export function addMonths(s: string, months: number): string {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

export function addPeriod(s: string, period: Period, count = 1): string {
  switch (period) {
    case "daily":
      return addDays(s, count);
    case "weekly":
      return addDays(s, 7 * count);
    case "monthly":
      return addMonths(s, count);
    case "yearly":
      return addMonths(s, 12 * count);
  }
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

// Normalises a per-period amount to a monthly figure for MRR.
export function monthlyFactor(period: Period, count = 1): number {
  switch (period) {
    case "daily":
      return 365 / 12 / count;
    case "weekly":
      return 52 / 12 / count;
    case "monthly":
      return 1 / count;
    case "yearly":
      return 1 / (12 * count);
  }
}
