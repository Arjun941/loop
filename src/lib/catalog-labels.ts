/**
 * Human labels for catalog enums, shared by lists and forms.
 */
export const PRODUCT_TYPE_LABEL = { service: "Service", goods: "Goods", addon: "Add-on" } as const;
export const PERIOD_LABEL = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" } as const;
export const PER_PERIOD = { daily: "day", weekly: "week", monthly: "month", yearly: "year" } as const;

/** Paise → the plain rupee string a form input expects ("1499.5"). */
export function toRupeeInput(minor: number | null | undefined) {
  return minor == null ? "" : String(minor / 100);
}
