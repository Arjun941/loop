"use server";
/**
 * Catalog changes. Only an admin may make them; staff see the catalog read-only.
 * Anything already used by subscriptions is archived rather than deleted, so history stays intact.
 */
import type { FormState } from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/auth";
import { discountSchema, parseDiscountValue, planSchema, productSchema, taxSchema, templateSchema } from "@/lib/validation/catalog";
import { requireStaff } from "@/server/auth/access";
import { db } from "@/server/db";
import { discounts, plans, products, productVariants, quotationTemplates, taxes, templateLines } from "@/server/db/schema";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const NOT_ADMIN: FormState = { error: "Only an admin can change the catalog." };

async function isAdmin() {
  return (await requireStaff()).role === "admin";
}

function done(): FormState {
  revalidatePath("/catalog", "layout");
  return { ok: true };
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, variants, ...fields } = parsed.data;

  await db.transaction(async (tx) => {
    const productId = id
      ? (await tx.update(products).set(fields).where(eq(products.id, id)).returning({ id: products.id }))[0].id
      : (await tx.insert(products).values(fields).returning({ id: products.id }))[0].id;

    // Sync variants: update kept ones, insert new ones, remove the rest.
    const keep = variants.flatMap((v) => (v.id ? [v.id] : []));
    await tx
      .delete(productVariants)
      .where(and(eq(productVariants.productId, productId), keep.length ? notInArray(productVariants.id, keep) : undefined));
    for (const { id: variantId, ...v } of variants) {
      if (variantId) await tx.update(productVariants).set(v).where(eq(productVariants.id, variantId));
      else await tx.insert(productVariants).values({ ...v, productId });
    }
  });
  return done();
}

export async function setProductActive(id: string, active: boolean): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  await db.update(products).set({ active }).where(eq(products.id, id));
  return done();
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export async function savePlan(_: FormState, form: FormData): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  const parsed = planSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, ...fields } = parsed.data;
  if (id) await db.update(plans).set(fields).where(eq(plans.id, id));
  else await db.insert(plans).values(fields);
  return done();
}

export async function setPlanActive(id: string, active: boolean): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  await db.update(plans).set({ active }).where(eq(plans.id, id));
  return done();
}

// ─── Taxes ───────────────────────────────────────────────────────────────────

export async function saveTax(_: FormState, form: FormData): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  const parsed = taxSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, rate, scope, productType, productId, name } = parsed.data;
  const fields = {
    name,
    rateBps: rate,
    scope,
    productType: scope === "product_type" ? productType! : null,
    productId: scope === "product" ? productId! : null,
  };
  if (id) await db.update(taxes).set(fields).where(eq(taxes.id, id));
  else await db.insert(taxes).values(fields);
  return done();
}

export async function setTaxActive(id: string, active: boolean): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  await db.update(taxes).set({ active }).where(eq(taxes.id, id));
  return done();
}

// ─── Discounts ───────────────────────────────────────────────────────────────

export async function saveDiscount(_: FormState, form: FormData): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  const input = Object.fromEntries(form);
  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) {
    // Zod skips the amount check while other fields fail, so report it too: every error shows at once.
    const value = parseDiscountValue(String(input.kind), input.value);
    return { fieldErrors: { ...("error" in value && { value: value.error }), ...fieldErrors(parsed.error) } };
  }
  const { id, ...fields } = parsed.data;
  const values = { ...fields, productIds: fields.scope === "products" ? fields.productIds : [] };
  if (id) await db.update(discounts).set(values).where(eq(discounts.id, id));
  else await db.insert(discounts).values(values);
  return done();
}

export async function setDiscountActive(id: string, active: boolean): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  await db.update(discounts).set({ active }).where(eq(discounts.id, id));
  return done();
}

// ─── Quotation templates ─────────────────────────────────────────────────────

export async function saveTemplate(_: FormState, form: FormData): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  const parsed = templateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, lines, ...fields } = parsed.data;

  // Variants must belong to the product they're paired with.
  const variantIds = lines.flatMap((l) => (l.variantId ? [l.variantId] : []));
  if (variantIds.length) {
    const found = await db.select({ id: productVariants.id, productId: productVariants.productId }).from(productVariants).where(inArray(productVariants.id, variantIds));
    const ok = lines.every((l) => !l.variantId || found.some((v) => v.id === l.variantId && v.productId === l.productId));
    if (!ok) return { fieldErrors: { lines: "A variant doesn't match its product." } };
  }

  await db.transaction(async (tx) => {
    const templateId = id
      ? (await tx.update(quotationTemplates).set(fields).where(eq(quotationTemplates.id, id)).returning({ id: quotationTemplates.id }))[0].id
      : (await tx.insert(quotationTemplates).values(fields).returning({ id: quotationTemplates.id }))[0].id;
    await tx.delete(templateLines).where(eq(templateLines.templateId, templateId));
    await tx.insert(templateLines).values(lines.map((l) => ({ templateId, productId: l.productId, variantId: l.variantId ?? null, qty: l.qty })));
  });
  return done();
}

export async function deleteTemplate(id: string): Promise<FormState> {
  if (!(await isAdmin())) return NOT_ADMIN;
  // Templates only seed new subscriptions, so nothing references them and they can be removed.
  await db.delete(quotationTemplates).where(eq(quotationTemplates.id, id));
  return done();
}
