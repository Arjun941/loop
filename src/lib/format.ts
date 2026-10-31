// Money is stored in minor units (paise). These helpers are the only place that converts it.

const CURRENCY = "INR";
const LOCALE = "en-IN";

const full = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

export function money(minor: number, opts: { compact?: boolean; whole?: boolean } = {}) {
  const value = minor / 100;
  if (opts.compact) return compact.format(value);
  if (opts.whole) return whole.format(value);
  return full.format(value);
}

export function toMinor(major: number | string) {
  return Math.round(Number(major) * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

export function formatDate(value: string | Date | null | undefined, opts: { short?: boolean } = {}) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : value;
  return (opts.short ? shortFmt : dateFmt).format(d);
}

export function number(n: number) {
  return new Intl.NumberFormat(LOCALE).format(n);
}
