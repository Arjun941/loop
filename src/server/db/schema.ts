import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Money is stored as integer minor units (paise / cents) to keep arithmetic exact.
// Every table has Row Level Security on with no policies: Supabase's public Data API sees nothing,
// while the app's server connects as the database owner and isn't affected.

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["admin", "staff", "customer"]);
export const productTypeEnum = pgEnum("product_type", ["service", "goods", "addon"]);
export const periodEnum = pgEnum("billing_period", ["daily", "weekly", "monthly", "yearly"]);
export const subStatusEnum = pgEnum("subscription_status", [
  "draft",
  "quotation",
  "confirmed",
  "active",
  "paused",
  "closed",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "confirmed", "paid", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["bank", "card", "upi", "cash", "cheque"]);
export const paymentSourceEnum = pgEnum("payment_source", ["manual", "bank_match", "portal"]);
export const discountKindEnum = pgEnum("discount_kind", ["fixed", "percent"]);
export const discountScopeEnum = pgEnum("discount_scope", ["subscription", "products"]);
export const taxScopeEnum = pgEnum("tax_scope", ["all", "product_type", "product"]);
export const bankLineStatusEnum = pgEnum("bank_line_status", ["auto", "review", "ignored", "applied"]);
export const reminderKindEnum = pgEnum("reminder_kind", [
  "overdue_1",
  "overdue_7",
  "overdue_14",
  "renewal_14",
]);

// ─── Identity ────────────────────────────────────────────────────────────────

export const companySettings = pgTable("company_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("My company"),
  currency: text("currency").notNull().default("INR"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(15),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
}).enableRLS();

export const customers = pgTable(
  "customers",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    phone: text("phone"),
    address: text("address"),
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index("customers_name_idx").on(t.name),
    index("customers_email_idx").on(t.email),
    index("customers_created_idx").on(t.createdAt),
  ],
).enableRLS();

// Login identities live in Supabase Auth (auth.users). A profile adds what the app needs:
// the person's role and, for customers, which customer record they can see.
const authUsers = pgSchema("auth").table("users", { id: uuid("id").primaryKey() });

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull().default("customer"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("profiles_email_unique").on(sql`lower(${t.email})`)],
).enableRLS();

/**
 * API keys for the MCP server. A key acts as the person who created it (same role, same limits).
 * Only a SHA-256 hash is stored; the key itself is shown once, when it's created.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    name: text("name").notNull(),
    /** The first characters of the key, so people can tell keys apart. */
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("api_keys_profile_idx").on(t.profileId)],
).enableRLS();

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: id(),
  name: text("name").notNull(),
  type: productTypeEnum("type").notNull().default("service"),
  salesPrice: integer("sales_price").notNull(),
  costPrice: integer("cost_price").notNull().default(0),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}).enableRLS();

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    attribute: text("attribute").notNull(),
    value: text("value").notNull(),
    extraPrice: integer("extra_price").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
).enableRLS();

export const plans = pgTable("plans", {
  id: id(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  period: periodEnum("period").notNull().default("monthly"),
  intervalCount: integer("interval_count").notNull().default(1),
  minQty: integer("min_qty").notNull().default(1),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  autoClose: boolean("auto_close").notNull().default(false),
  closable: boolean("closable").notNull().default(true),
  pausable: boolean("pausable").notNull().default(false),
  renewable: boolean("renewable").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}).enableRLS();

export const taxes = pgTable("taxes", {
  id: id(),
  name: text("name").notNull(),
  // Basis points: 1800 = 18.00%
  rateBps: integer("rate_bps").notNull(),
  scope: taxScopeEnum("scope").notNull().default("all"),
  productType: productTypeEnum("product_type"),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}).enableRLS();

export const discounts = pgTable("discounts", {
  id: id(),
  name: text("name").notNull(),
  kind: discountKindEnum("kind").notNull(),
  // Percent discounts use basis points; fixed discounts use minor units.
  value: integer("value").notNull(),
  minAmount: integer("min_amount"),
  minQty: integer("min_qty"),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  usageLimit: integer("usage_limit"),
  timesUsed: integer("times_used").notNull().default(0),
  scope: discountScopeEnum("scope").notNull().default("subscription"),
  productIds: jsonb("product_ids").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}).enableRLS();

export const quotationTemplates = pgTable("quotation_templates", {
  id: id(),
  name: text("name").notNull(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  validityDays: integer("validity_days").notNull().default(30),
  paymentTermsDays: integer("payment_terms_days").notNull().default(15),
  createdAt: createdAt(),
}).enableRLS();

export const templateLines = pgTable("template_lines", {
  id: id(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => quotationTemplates.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  variantId: uuid("variant_id").references(() => productVariants.id),
  qty: integer("qty").notNull().default(1),
}).enableRLS();

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    number: text("number").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: subStatusEnum("status").notNull().default("draft"),
    startDate: date("start_date").notNull(),
    expiryDate: date("expiry_date"),
    nextInvoiceDate: date("next_invoice_date"),
    paymentTermsDays: integer("payment_terms_days").notNull().default(15),
    quoteValidUntil: date("quote_valid_until"),
    discountId: uuid("discount_id").references(() => discounts.id),
    // Monthly-normalised recurring value, kept in sync with lines for fast MRR queries.
    mrr: integer("mrr").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("subs_status_next_idx").on(t.status, t.nextInvoiceDate),
    index("subs_customer_idx").on(t.customerId),
    index("subs_expiry_idx").on(t.expiryDate),
    index("subs_created_idx").on(t.createdAt),
  ],
).enableRLS();

export const subscriptionLines = pgTable(
  "subscription_lines",
  {
    id: id(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    // Null for the plan line itself; set for product lines.
    productId: uuid("product_id").references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    description: text("description").notNull(),
    qty: integer("qty").notNull().default(1),
    unitPrice: integer("unit_price").notNull(),
  },
  (t) => [index("sub_lines_sub_idx").on(t.subscriptionId)],
).enableRLS();

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: id(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    fromStatus: subStatusEnum("from_status"),
    toStatus: subStatusEnum("to_status").notNull(),
    // Change in monthly recurring value caused by this event, for MRR movement.
    mrrDelta: integer("mrr_delta").notNull().default(0),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    note: text("note"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sub_events_sub_idx").on(t.subscriptionId), index("sub_events_at_idx").on(t.at)],
).enableRLS();

// ─── Invoicing ───────────────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    number: text("number").notNull().unique(),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    subtotal: integer("subtotal").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    taxTotal: integer("tax_total").notNull().default(0),
    total: integer("total").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    discountId: uuid("discount_id").references(() => discounts.id),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    // The guarantee that nothing is billed twice.
    uniqueIndex("invoices_sub_period_unique").on(t.subscriptionId, t.periodStart),
    index("invoices_status_due_idx").on(t.status, t.dueDate),
    index("invoices_customer_idx").on(t.customerId),
    index("invoices_issue_idx").on(t.issueDate),
  ],
).enableRLS();

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: id(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
    description: text("description").notNull(),
    qty: integer("qty").notNull().default(1),
    unitPrice: integer("unit_price").notNull(),
    discount: integer("discount").notNull().default(0),
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    amount: integer("amount").notNull(),
  },
  (t) => [index("invoice_lines_invoice_idx").on(t.invoiceId)],
).enableRLS();

export const payments = pgTable(
  "payments",
  {
    id: id(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    method: paymentMethodEnum("method").notNull(),
    amount: integer("amount").notNull(),
    paidOn: date("paid_on").notNull(),
    note: text("note"),
    source: paymentSourceEnum("source").notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [index("payments_invoice_idx").on(t.invoiceId), index("payments_paid_on_idx").on(t.paidOn)],
).enableRLS();

// ─── Reconciliation ──────────────────────────────────────────────────────────

export const bankImports = pgTable("bank_imports", {
  id: id(),
  fileName: text("file_name").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const bankLines = pgTable(
  "bank_lines",
  {
    id: id(),
    importId: uuid("import_id")
      .notNull()
      .references(() => bankImports.id, { onDelete: "cascade" }),
    txnDate: date("txn_date").notNull(),
    amount: integer("amount").notNull(),
    reference: text("reference").notNull(),
    matchedInvoiceId: uuid("matched_invoice_id").references(() => invoices.id),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    status: bankLineStatusEnum("status").notNull().default("review"),
  },
  (t) => [index("bank_lines_import_idx").on(t.importId)],
).enableRLS();

// ─── Communication ───────────────────────────────────────────────────────────

export const reminders = pgTable(
  "reminders",
  {
    id: id(),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
    kind: reminderKindEnum("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // One email per stage, never repeated.
  (t) => [
    uniqueIndex("reminders_invoice_kind_unique").on(t.invoiceId, t.kind),
    uniqueIndex("reminders_sub_kind_unique").on(t.subscriptionId, t.kind),
  ],
).enableRLS();

export const emailLog = pgTable(
  "email_log",
  {
    id: id(),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    template: text("template").notNull(),
    html: text("html"),
    status: text("status").notNull(),
    providerId: text("provider_id"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("email_log_customer_idx").on(t.customerId), index("email_log_created_idx").on(t.createdAt)],
).enableRLS();
