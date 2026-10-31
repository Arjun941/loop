/**
 * Loads what pricing needs from the database (taxes, discounts, catalog prices)
 * and turns subscription lines into priced lines.
 */
import "server-only";
import type { DiscountRule, PricingLine, TaxRule } from "@/lib/domain/pricing";
import { db } from "@/server/db";
import { discounts, products, productVariants, taxes } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

type Executor = Pick<typeof db, "select">;

export async function loadTaxes(tx: Executor = db): Promise<TaxRule[]> {
  return tx.select().from(taxes).where(eq(taxes.active, true));
}

export async function loadDiscount(id: string | null | undefined, tx: Executor = db): Promise<DiscountRule | null> {
  if (!id) return null;
  const [row] = await tx.select().from(discounts).where(eq(discounts.id, id));
  return row ?? null;
}

/** Product types for the given ids, to match type-scoped taxes. */
export async function loadProductTypes(ids: string[], tx: Executor = db) {
  if (ids.length === 0) return new Map<string, PricingLine["productType"]>();
  const rows = await tx.select({ id: products.id, type: products.type }).from(products).where(inArray(products.id, ids));
  return new Map(rows.map((r) => [r.id, r.type]));
}

/** Catalog prices for building new lines: product price plus variant extra, with a readable description. */
export async function loadCatalogPrices(productIds: string[], tx: Executor = db) {
  if (productIds.length === 0) return { products: new Map(), variants: new Map() };
  const [productRows, variantRows] = await Promise.all([
    tx.select().from(products).where(inArray(products.id, productIds)),
    tx.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
  ]);
  return {
    products: new Map(productRows.map((p) => [p.id, p])),
    variants: new Map(variantRows.map((v) => [v.id, v])),
  };
}
