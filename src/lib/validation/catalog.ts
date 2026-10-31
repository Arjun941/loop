/**
 * Catalog validation, shared by the admin forms and the server actions.
 * Forms submit human units (rupees, percent); these schemas convert to storage units (paise, basis points).
 */
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((v) => v || null);

/** Rupees as typed (e.g. "1,499.50") → integer paise. */
export const rupees = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = Number(v.replace(/[,₹\s]/g, ""));
    if (!v || Number.isNaN(n)) ctx.addIssue({ code: "custom", message: "Enter an amount" });
    else if (n < 0) ctx.addIssue({ code: "custom", message: "Can't be negative" });
    else if (n > 10_000_000) ctx.addIssue({ code: "custom", message: "That's too large" });
    else return Math.round(n * 100);
    return z.NEVER;
  });

const optionalRupees = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const parsed = rupees.safeParse(v);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: parsed.error.issues[0].message });
      return z.NEVER;
    }
    return parsed.data;
  });

/** Percent as typed (e.g. "18" or "12.5") → basis points. */
const percent = z
  .string()
  .trim()
  .min(1, "Enter a percentage")
  .pipe(z.coerce.number<string>({ error: "Enter a percentage" }).gt(0, "Must be more than 0").max(100, "Can't exceed 100%"))
  .transform((v) => Math.round(v * 100));

const wholeNumber = (min: number, message: string) => z.coerce.number({ error: message }).int(message).min(min, message);

const optionalWhole = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) {
      ctx.addIssue({ code: "custom", message: "Enter a whole number above 0" });
      return z.NEVER;
    }
    return n;
  });

const optionalDate = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .transform((v) => v || null);

/** Checkbox inputs submit "on" when checked and nothing otherwise. */
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

/** Lists edited client-side are submitted as one JSON field. */
const jsonArray = <T extends z.ZodType>(item: T) =>
  z
    .string()
    .default("[]")
    .transform((v, ctx) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid list" });
        return z.NEVER;
      }
    })
    .pipe(z.array(item));

const dateRange = <T extends { startsOn: string | null; endsOn: string | null }>(v: T) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn;
const dateRangeIssue = { message: "The end date must be on or after the start date", path: ["endsOn"] };

export const PRODUCT_TYPES = ["service", "goods", "addon"] as const;
export const PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  attribute: z.string().trim().min(1, "Attribute is required").max(40),
  value: z.string().trim().min(1, "Value is required").max(60),
  extraPrice: z.coerce.number().min(0).max(10_000_000).transform((v) => Math.round(v * 100)),
});

export const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2, "Give the product a name").max(80),
  type: z.enum(PRODUCT_TYPES),
  salesPrice: rupees,
  costPrice: rupees,
  notes: optionalText,
  variants: jsonArray(variantSchema),
});

export const planSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    name: z.string().trim().min(2, "Give the plan a name").max(80),
    price: rupees,
    period: z.enum(PERIODS),
    minQty: wholeNumber(1, "Minimum quantity must be at least 1"),
    startsOn: optionalDate,
    endsOn: optionalDate,
    autoClose: checkbox,
    closable: checkbox,
    pausable: checkbox,
    renewable: checkbox,
  })
  .refine(dateRange, dateRangeIssue);

export const taxSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    name: z.string().trim().min(2, "Give the tax a name").max(60),
    rate: percent,
    scope: z.enum(["all", "product_type", "product"]),
    productType: z.enum(PRODUCT_TYPES).optional().or(z.literal("").transform(() => undefined)),
    productId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.scope !== "product_type" || v.productType, { message: "Choose a product type", path: ["productType"] })
  .refine((v) => v.scope !== "product" || v.productId, { message: "Choose a product", path: ["productId"] });

/** Checks a discount amount in its unit: percent (→ basis points) or fixed rupees (→ paise). */
export function parseDiscountValue(kind: string, value: unknown): { value: number } | { error: string } {
  if (!String(value ?? "").trim()) return { error: "Enter an amount" };
  const parsed = kind === "percent" ? percent.safeParse(value) : rupees.safeParse(String(value ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data === 0) return { error: "Must be more than 0" };
  return { value: parsed.data };
}

export const discountSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    name: z.string().trim().min(2, "Give the discount a name").max(80),
    kind: z.enum(["fixed", "percent"]),
    value: z.string().trim(),
    minAmount: optionalRupees,
    minQty: optionalWhole,
    startsOn: optionalDate,
    endsOn: optionalDate,
    usageLimit: optionalWhole,
    scope: z.enum(["subscription", "products"]),
    productIds: jsonArray(z.string().uuid()),
  })
  .transform((v, ctx) => {
    // The value's unit depends on the kind, so it's checked once the kind is known.
    const parsed = parseDiscountValue(v.kind, v.value);
    if ("error" in parsed) {
      ctx.addIssue({ code: "custom", message: parsed.error, path: ["value"] });
      return z.NEVER;
    }
    return { ...v, value: parsed.value };
  })
  .refine(dateRange, dateRangeIssue)
  .refine((v) => v.scope !== "products" || v.productIds.length > 0, { message: "Pick at least one product", path: ["productIds"] });

export const templateLineSchema = z.object({
  productId: z.string().uuid({ error: "Choose a product" }),
  variantId: z.string().uuid().nullable().optional(),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const templateSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2, "Give the template a name").max(80),
  planId: z.string().uuid({ error: "Choose a plan" }),
  validityDays: wholeNumber(1, "Validity must be at least 1 day"),
  paymentTermsDays: wholeNumber(0, "Enter the number of days"),
  lines: jsonArray(templateLineSchema).refine((l) => l.length > 0, "Add at least one product"),
});
