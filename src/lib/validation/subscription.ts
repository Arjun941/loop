/**
 * Subscription form validation. Prices are never taken from the form: the server
 * looks them up from the catalog, so a tampered request can't change what's billed.
 */
import { z } from "zod";

const uuid = (message: string) => z.string().uuid({ error: message });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const optionalDate = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
  .transform((v) => v || null);

export const subscriptionLineSchema = z.object({
  productId: uuid("Choose a product"),
  variantId: z.string().uuid().nullable().optional(),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const subscriptionSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    customerId: uuid("Choose a customer"),
    planId: uuid("Choose a plan"),
    planQty: z.coerce.number({ error: "Enter a quantity" }).int("Enter a whole number").min(1, "Quantity must be at least 1"),
    startDate: isoDate,
    expiryDate: optionalDate,
    quoteValidUntil: optionalDate,
    paymentTermsDays: z.coerce.number({ error: "Enter the number of days" }).int().min(0, "Can't be negative").max(365),
    discountId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    lines: z
      .string()
      .default("[]")
      .transform((v, ctx) => {
        try {
          return JSON.parse(v) as unknown;
        } catch {
          ctx.addIssue({ code: "custom", message: "Invalid lines" });
          return z.NEVER;
        }
      })
      .pipe(z.array(subscriptionLineSchema)),
  })
  .refine((v) => !v.expiryDate || v.expiryDate > v.startDate, { message: "Expiry must be after the start date", path: ["expiryDate"] });

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

/** Blank optional text becomes null, so empty fields aren't stored as "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email" })),
  company: optionalText(120),
  phone: optionalText(40),
  address: optionalText(300),
});
