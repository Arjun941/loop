/**
 * Catalog reads: products (with variants), plans, quotation templates, discounts and taxes.
 * Each list also reports how much it's in use, so the UI can explain why something can only be archived.
 */
import "server-only";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import { discounts, plans, products, productVariants, quotationTemplates, subscriptionLines, subscriptions, taxes, templateLines } from "@/server/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";

/** Whether the viewer may edit the catalog (admins only). */
async function viewer() {
  const user = await requireStaff();
  return { canEdit: user.role === "admin" };
}

export async function getProducts() {
  const { canEdit } = await viewer();
  const [rows, variants, usage] = await Promise.all([
    db.select().from(products).orderBy(desc(products.active), asc(products.name)),
    db.select().from(productVariants).orderBy(asc(productVariants.attribute), asc(productVariants.value)),
    db
      .select({ productId: subscriptionLines.productId, count: sql<number>`count(distinct ${subscriptionLines.subscriptionId})::int` })
      .from(subscriptionLines)
      .groupBy(subscriptionLines.productId),
  ]);
  const inUse = new Map(usage.map((u) => [u.productId, u.count]));
  return {
    canEdit,
    products: rows.map((product) => ({
      ...product,
      inUse: inUse.get(product.id) ?? 0,
      variants: variants.filter((v) => v.productId === product.id),
    })),
  };
}

export async function getPlans() {
  const { canEdit } = await viewer();
  const [rows, usage] = await Promise.all([
    db.select().from(plans).orderBy(desc(plans.active), asc(plans.price)),
    db
      .select({ planId: subscriptions.planId, count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.planId),
  ]);
  const active = new Map(usage.map((u) => [u.planId, u.count]));
  return { canEdit, plans: rows.map((plan) => ({ ...plan, activeSubs: active.get(plan.id) ?? 0 })) };
}

export async function getTaxes() {
  const { canEdit } = await viewer();
  const rows = await db
    .select({ tax: taxes, productName: products.name })
    .from(taxes)
    .leftJoin(products, eq(products.id, taxes.productId))
    .orderBy(desc(taxes.active), asc(taxes.name));
  return { canEdit, taxes: rows.map(({ tax, productName }) => ({ ...tax, productName })) };
}

export async function getDiscounts() {
  const { canEdit } = await viewer();
  const rows = await db.select().from(discounts).orderBy(desc(discounts.active), desc(discounts.createdAt));
  return { canEdit, discounts: rows };
}

export async function getTemplates() {
  const { canEdit } = await viewer();
  const [rows, lines] = await Promise.all([
    db
      .select({ template: quotationTemplates, planName: plans.name, planPrice: plans.price, period: plans.period })
      .from(quotationTemplates)
      .innerJoin(plans, eq(plans.id, quotationTemplates.planId))
      .orderBy(asc(quotationTemplates.name)),
    db
      .select({ line: templateLines, productName: products.name, variantValue: productVariants.value })
      .from(templateLines)
      .innerJoin(products, eq(products.id, templateLines.productId))
      .leftJoin(productVariants, eq(productVariants.id, templateLines.variantId)),
  ]);
  return {
    canEdit,
    templates: rows.map(({ template, ...plan }) => ({
      ...template,
      ...plan,
      lines: lines.filter((l) => l.line.templateId === template.id).map(({ line, productName, variantValue }) => ({ ...line, productName, variantValue })),
    })),
  };
}

/** Lightweight lists for pickers inside catalog forms. */
export async function getCatalogOptions() {
  await requireStaff();
  const [productRows, variantRows, planRows] = await Promise.all([
    db.select({ id: products.id, name: products.name, type: products.type, salesPrice: products.salesPrice }).from(products).where(eq(products.active, true)).orderBy(asc(products.name)),
    db.select({ id: productVariants.id, productId: productVariants.productId, attribute: productVariants.attribute, value: productVariants.value, extraPrice: productVariants.extraPrice }).from(productVariants),
    db.select({ id: plans.id, name: plans.name, price: plans.price, period: plans.period, minQty: plans.minQty }).from(plans).where(eq(plans.active, true)).orderBy(asc(plans.price)),
  ]);
  return {
    products: productRows.map((p) => ({ ...p, variants: variantRows.filter((v) => v.productId === p.id) })),
    plans: planRows,
  };
}

export type CatalogOptions = Awaited<ReturnType<typeof getCatalogOptions>>;
export type ProductRow = Awaited<ReturnType<typeof getProducts>>["products"][number];
export type PlanRow = Awaited<ReturnType<typeof getPlans>>["plans"][number];
export type TaxRow = Awaited<ReturnType<typeof getTaxes>>["taxes"][number];
export type DiscountRow = Awaited<ReturnType<typeof getDiscounts>>["discounts"][number];
export type TemplateRow = Awaited<ReturnType<typeof getTemplates>>["templates"][number];
