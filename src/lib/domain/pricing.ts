/**
 * Pricing rules: taxes, discounts and totals for a set of lines.
 *
 * Pure and shared: the subscription form uses it for its live preview, and the billing engine
 * uses the same function to build invoices, so what the team sees is exactly what gets billed.
 * All amounts are integer paise; rates are basis points (1800 = 18%).
 */

export type ProductType = "service" | "goods" | "addon";

export type PricingLine = {
  /** Null for the plan line. */
  productId: string | null;
  /** The plan line counts as a service for tax purposes. */
  productType: ProductType;
  description: string;
  qty: number;
  unitPrice: number;
};

export type TaxRule = {
  id: string;
  name: string;
  rateBps: number;
  scope: "all" | "product_type" | "product";
  productType: ProductType | null;
  productId: string | null;
  active: boolean;
};

export type DiscountRule = {
  id: string;
  name: string;
  kind: "fixed" | "percent";
  /** Basis points for percent, paise for fixed. */
  value: number;
  minAmount: number | null;
  minQty: number | null;
  startsOn: string | null;
  endsOn: string | null;
  usageLimit: number | null;
  timesUsed: number;
  scope: "subscription" | "products";
  productIds: string[];
  active: boolean;
};

export type PricedLine = PricingLine & {
  /** qty × unit price, before discount and tax. */
  amount: number;
  discount: number;
  taxRateBps: number;
  taxAmount: number;
};

export type PriceResult = {
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  /** Set when a discount was offered; `applied` false explains why it didn't apply. */
  discount: { id: string; name: string; applied: boolean; reason?: string } | null;
};

/** Every active tax rule that matches this line. Rates stack. */
export function taxesFor(line: PricingLine, taxes: TaxRule[]): TaxRule[] {
  return taxes.filter(
    (t) =>
      t.active &&
      (t.scope === "all" ||
        (t.scope === "product_type" && t.productType === line.productType) ||
        (t.scope === "product" && line.productId !== null && t.productId === line.productId)),
  );
}

function eligibleForDiscount(line: PricingLine, discount: DiscountRule) {
  return discount.scope === "subscription" || (line.productId !== null && discount.productIds.includes(line.productId));
}

/** Whether a discount can be used on these lines on this date, and if not, why. */
export function checkDiscount(discount: DiscountRule, lines: PricingLine[], onDate: string): { ok: true } | { ok: false; reason: string } {
  if (!discount.active) return { ok: false, reason: "Discount is archived" };
  if (discount.startsOn && onDate < discount.startsOn) return { ok: false, reason: "Discount hasn't started yet" };
  if (discount.endsOn && onDate > discount.endsOn) return { ok: false, reason: "Discount has expired" };
  if (discount.usageLimit !== null && discount.timesUsed >= discount.usageLimit) return { ok: false, reason: "Discount has been used up" };

  const eligible = lines.filter((l) => eligibleForDiscount(l, discount));
  if (eligible.length === 0) return { ok: false, reason: "No eligible products" };
  const qty = eligible.reduce((s, l) => s + l.qty, 0);
  const amount = eligible.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  if (discount.minQty !== null && qty < discount.minQty) return { ok: false, reason: `Needs ${discount.minQty}+ units` };
  if (discount.minAmount !== null && amount < discount.minAmount) return { ok: false, reason: "Below the minimum purchase" };
  return { ok: true };
}

/**
 * Splits `total` across `weights` proportionally, in whole paise, so the parts always sum to `total`.
 * The rounding remainder goes to the largest weight.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0 || total === 0) return weights.map(() => 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  const remainder = total - parts.reduce((a, b) => a + b, 0);
  const largest = weights.indexOf(Math.max(...weights));
  parts[largest] += remainder;
  return parts;
}

/** Prices a set of lines: discount (if it qualifies), then tax on the discounted amount. */
export function priceLines(
  lines: PricingLine[],
  { taxes, discount, onDate }: { taxes: TaxRule[]; discount?: DiscountRule | null; onDate: string },
): PriceResult {
  const amounts = lines.map((l) => l.qty * l.unitPrice);
  const subtotal = amounts.reduce((a, b) => a + b, 0);

  let discounts = lines.map(() => 0);
  let discountInfo: PriceResult["discount"] = null;
  if (discount) {
    const check = checkDiscount(discount, lines, onDate);
    discountInfo = { id: discount.id, name: discount.name, applied: check.ok, reason: check.ok ? undefined : check.reason };
    if (check.ok) {
      const weights = lines.map((l, i) => (eligibleForDiscount(l, discount) ? amounts[i] : 0));
      const base = weights.reduce((a, b) => a + b, 0);
      const value = discount.kind === "percent" ? Math.round((base * discount.value) / 10_000) : Math.min(discount.value, base);
      discounts = allocate(value, weights);
    }
  }

  const priced: PricedLine[] = lines.map((line, i) => {
    const taxRateBps = taxesFor(line, taxes).reduce((s, t) => s + t.rateBps, 0);
    const taxAmount = Math.round(((amounts[i] - discounts[i]) * taxRateBps) / 10_000);
    return { ...line, amount: amounts[i], discount: discounts[i], taxRateBps, taxAmount };
  });

  const discountTotal = discounts.reduce((a, b) => a + b, 0);
  const taxTotal = priced.reduce((s, l) => s + l.taxAmount, 0);
  return { lines: priced, subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal, discount: discountInfo };
}
