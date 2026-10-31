import { describe, expect, it } from "vitest";
import { allocate, checkDiscount, priceLines, type DiscountRule, type PricingLine, type TaxRule } from "./pricing";

const GST: TaxRule = { id: "gst", name: "GST", rateBps: 1800, scope: "all", productType: null, productId: null, active: true };
const CESS: TaxRule = { id: "cess", name: "Cess", rateBps: 200, scope: "product_type", productType: "goods", productId: null, active: true };

const plan: PricingLine = { productId: null, productType: "service", description: "Growth Monthly", qty: 3, unitPrice: 89_900 };
const kit: PricingLine = { productId: "kit", productType: "goods", description: "Onboarding Kit", qty: 1, unitPrice: 499_900 };

const discount = (over: Partial<DiscountRule> = {}): DiscountRule => ({
  id: "d",
  name: "10% off",
  kind: "percent",
  value: 1000,
  minAmount: null,
  minQty: null,
  startsOn: null,
  endsOn: null,
  usageLimit: null,
  timesUsed: 0,
  scope: "subscription",
  productIds: [],
  active: true,
  ...over,
});

const onDate = "2026-11-01";

describe("taxes", () => {
  it("applies GST to every line and stacks a goods-only cess", () => {
    const r = priceLines([plan, kit], { taxes: [GST, CESS], onDate });
    expect(r.lines[0].taxRateBps).toBe(1800);
    expect(r.lines[1].taxRateBps).toBe(2000);
    expect(r.taxTotal).toBe(Math.round(269_700 * 0.18) + Math.round(499_900 * 0.2));
    expect(r.total).toBe(r.subtotal + r.taxTotal);
  });

  it("ignores archived taxes", () => {
    const r = priceLines([plan], { taxes: [{ ...GST, active: false }], onDate });
    expect(r.taxTotal).toBe(0);
  });
});

describe("discounts", () => {
  it("takes a percentage off and taxes the discounted amount", () => {
    const r = priceLines([plan], { taxes: [GST], discount: discount(), onDate });
    expect(r.discountTotal).toBe(26_970);
    expect(r.taxTotal).toBe(Math.round((269_700 - 26_970) * 0.18));
    expect(r.discount?.applied).toBe(true);
  });

  it("caps a fixed discount at the eligible amount", () => {
    const r = priceLines([plan], { taxes: [], discount: discount({ kind: "fixed", value: 10_000_000 }), onDate });
    expect(r.discountTotal).toBe(269_700);
    expect(r.total).toBe(0);
  });

  it("only discounts the chosen products", () => {
    const r = priceLines([plan, kit], { taxes: [], discount: discount({ scope: "products", productIds: ["kit"] }), onDate });
    expect(r.lines[0].discount).toBe(0);
    expect(r.lines[1].discount).toBe(49_990);
  });

  it.each([
    ["expired", { endsOn: "2026-10-31" }, "Discount has expired"],
    ["not started", { startsOn: "2026-12-01" }, "Discount hasn't started yet"],
    ["used up", { usageLimit: 5, timesUsed: 5 }, "Discount has been used up"],
    ["below quantity", { minQty: 10 }, "Needs 10+ units"],
    ["below amount", { minAmount: 1_000_000 }, "Below the minimum purchase"],
  ])("does not apply when %s", (_, over, reason) => {
    const r = priceLines([plan], { taxes: [], discount: discount(over), onDate });
    expect(r.discountTotal).toBe(0);
    expect(r.discount).toMatchObject({ applied: false, reason });
  });

  it("applies on its last day", () => {
    expect(checkDiscount(discount({ endsOn: onDate }), [plan], onDate)).toEqual({ ok: true });
  });
});

describe("allocate", () => {
  it("always sums to the total, even with rounding", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it("gives nothing to zero weights", () => {
    expect(allocate(500, [0, 10, 0])).toEqual([0, 500, 0]);
  });
});
