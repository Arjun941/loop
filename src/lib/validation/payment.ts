/**
 * Payment form validation. Amounts are typed in rupees and stored in paise.
 */
import { z } from "zod";

export const PAYMENT_METHODS = ["bank", "upi", "card", "cheque", "cash"] as const;
export const PAYMENT_METHOD_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  bank: "Bank transfer",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
  cash: "Cash",
};

export const paymentSchema = z.object({
  invoiceId: z.string().uuid({ error: "Choose an invoice" }),
  amount: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = Number(v.replace(/[,₹\s]/g, ""));
      if (!v || Number.isNaN(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: "Enter an amount above zero" });
        return z.NEVER;
      }
      return Math.round(n * 100);
    }),
  method: z.enum(PAYMENT_METHODS),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null),
});
