/**
 * Seeds a realistic demo business ("Acme Inc.") into Supabase: ~5k customers, ~8k subscriptions, ~50k invoices,
 * plus three demo logins created in Supabase Auth.
 *
 *   npm run db:reset    wipes app data and demo logins, migrates, then seeds
 *
 * Reset removes every row in the app's tables and the auth users that belonged to them.
 * Only run it against a project you're happy to wipe.
 */
import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { addDays, addPeriod, monthlyFactor, today, type Period } from "../../lib/dates";

const RESET = process.argv.includes("--reset");

const CUSTOMERS = Number(process.env.SEED_CUSTOMERS ?? 5000);
const SUBSCRIPTIONS = Number(process.env.SEED_SUBSCRIPTIONS ?? 8000);
const TAX_BPS = 1800;

// Demo logins. Passwords satisfy the signup rules (9+ chars, upper, lower, special).
export const DEMO_PASSWORD = "LoopDemo@2026";
const DEMO_USERS = [
  { email: "admin@loop.test", name: "Asha Rao", role: "admin" as const },
  { email: "staff@loop.test", name: "Vikram Shah", role: "staff" as const },
  { email: "customer@loop.test", name: "Meera Iyer", role: "customer" as const },
];

faker.seed(42);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(faker.number.float() * arr.length)];
const chance = (p: number) => faker.number.float() < p;
const rupees = (n: number) => Math.round(n * 100);

async function main() {
  const t0 = Date.now();
  const { db, closeDb } = await import("./index");
  const s = await import("./schema");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  if (RESET) {
    // Remove the logins that belong to this app's profiles (and any leftover demo logins), then all app data.
    const owned = new Set((await db.select({ id: s.profiles.id }).from(s.profiles)).map((p) => p.id));
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const u of data.users) {
        if (owned.has(u.id) || u.email?.endsWith("@loop.test")) await admin.auth.admin.deleteUser(u.id);
      }
      if (data.users.length < 1000) break;
    }
    const { rows: tables } = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'`);
    if (tables.length) await db.execute(sql.raw(`truncate ${tables.map((t) => `"${t.tablename}"`).join(", ")} restart identity cascade`));
    console.log("Reset: app data and logins removed.");
  }

  const insert = async <T extends Record<string, unknown>>(table: Parameters<typeof db.insert>[0], rows: T[], size = 1500) => {
    for (let i = 0; i < rows.length; i += size) {
      await db.insert(table).values(rows.slice(i, i + size) as never);
    }
  };

  const now = today();

  // ── Company ────────────────────────────────────────────────────────────────
  await db.insert(s.companySettings).values({ id: 1, name: "Acme Inc.", onboardingDone: true });

  // ── Catalog ────────────────────────────────────────────────────────────────
  const P = {
    crm: randomUUID(),
    analytics: randomUUID(),
    connector: randomUUID(),
    seats: randomUUID(),
    storage: randomUUID(),
    support: randomUUID(),
    onboarding: randomUUID(),
  };
  const productRows = [
    { id: P.crm, name: "Loop CRM", type: "service", salesPrice: rupees(1499), costPrice: rupees(320), notes: "Core CRM workspace" },
    { id: P.analytics, name: "Insights Analytics", type: "service", salesPrice: rupees(2499), costPrice: rupees(610), notes: "Dashboards and reports" },
    { id: P.connector, name: "ERP Connector", type: "service", salesPrice: rupees(999), costPrice: rupees(180), notes: "Sync with your ERP" },
    { id: P.seats, name: "Additional Seat", type: "addon", salesPrice: rupees(399), costPrice: rupees(40), notes: "Per user, per period" },
    { id: P.storage, name: "Extra Storage 100 GB", type: "addon", salesPrice: rupees(299), costPrice: rupees(90), notes: null },
    { id: P.support, name: "Priority Support", type: "addon", salesPrice: rupees(1999), costPrice: rupees(700), notes: "4-hour response SLA" },
    { id: P.onboarding, name: "Onboarding Kit", type: "goods", salesPrice: rupees(4999), costPrice: rupees(1800), notes: "Hardware tokens and printed guides" },
  ] as const;
  await insert(s.products, [...productRows]);

  const V = { odoo: randomUUID(), sap: randomUUID(), tally: randomUUID() };
  await insert(s.productVariants, [
    { id: V.odoo, productId: P.connector, attribute: "Brand", value: "Odoo", extraPrice: rupees(560) },
    { id: V.sap, productId: P.connector, attribute: "Brand", value: "SAP", extraPrice: rupees(1200) },
    { id: V.tally, productId: P.connector, attribute: "Brand", value: "Tally", extraPrice: rupees(300) },
  ]);
  const variantPrice: Record<string, number> = { [V.odoo]: rupees(560), [V.sap]: rupees(1200), [V.tally]: rupees(300) };
  const variantName: Record<string, string> = { [V.odoo]: "Odoo", [V.sap]: "SAP", [V.tally]: "Tally" };

  type PlanSeed = { id: string; name: string; price: number; period: Period; minQty: number; weight: number; autoClose: boolean; pausable: boolean; termMonths: number | null };
  const planSeeds: PlanSeed[] = [
    { id: randomUUID(), name: "Starter Monthly", price: rupees(1499), period: "monthly", minQty: 1, weight: 0.38, autoClose: false, pausable: true, termMonths: null },
    { id: randomUUID(), name: "Growth Monthly", price: rupees(899), period: "monthly", minQty: 3, weight: 0.3, autoClose: false, pausable: true, termMonths: null },
    { id: randomUUID(), name: "Business Yearly", price: rupees(8999), period: "yearly", minQty: 5, weight: 0.17, autoClose: true, pausable: false, termMonths: 24 },
    { id: randomUUID(), name: "Enterprise Yearly", price: rupees(12999), period: "yearly", minQty: 10, weight: 0.06, autoClose: false, pausable: false, termMonths: 36 },
    { id: randomUUID(), name: "Pilot Weekly", price: rupees(499), period: "weekly", minQty: 1, weight: 0.09, autoClose: true, pausable: false, termMonths: 2 },
    { id: randomUUID(), name: "Event Day Pass", price: rupees(199), period: "daily", minQty: 1, weight: 0, autoClose: true, pausable: false, termMonths: null },
  ];
  await insert(
    s.plans,
    planSeeds.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      period: p.period,
      minQty: p.minQty,
      startsOn: "2024-01-01",
      endsOn: null,
      autoClose: p.autoClose,
      closable: true,
      pausable: p.pausable,
      renewable: p.period !== "daily",
    })),
  );

  await insert(s.taxes, [{ name: "GST 18%", rateBps: TAX_BPS, scope: "all" }]);

  const D = { seats: randomUUID(), welcome: randomUUID() };
  await insert(s.discounts, [
    { id: D.seats, name: "10% off for 10+ seats", kind: "percent", value: 1000, minQty: 10, startsOn: "2026-01-01", endsOn: "2026-12-31", usageLimit: 500, scope: "subscription" },
    { id: D.welcome, name: "Welcome ₹500 off", kind: "fixed", value: rupees(500), minAmount: rupees(3000), startsOn: "2026-10-01", endsOn: "2026-11-30", usageLimit: 100, scope: "subscription" },
  ]);

  const T = { growth: randomUUID(), enterprise: randomUUID() };
  await insert(s.quotationTemplates, [
    { id: T.growth, name: "Growth team bundle", planId: planSeeds[1].id, validityDays: 14, paymentTermsDays: 15 },
    { id: T.enterprise, name: "Enterprise rollout", planId: planSeeds[3].id, validityDays: 30, paymentTermsDays: 30 },
  ]);
  await insert(s.templateLines, [
    { templateId: T.growth, productId: P.crm, qty: 1 },
    { templateId: T.growth, productId: P.seats, qty: 5 },
    { templateId: T.growth, productId: P.connector, variantId: V.odoo, qty: 1 },
    { templateId: T.enterprise, productId: P.crm, qty: 1 },
    { templateId: T.enterprise, productId: P.analytics, qty: 1 },
    { templateId: T.enterprise, productId: P.seats, qty: 25 },
    { templateId: T.enterprise, productId: P.support, qty: 1 },
  ]);

  // ── Customers & users ──────────────────────────────────────────────────────
  const customerRows = Array.from({ length: CUSTOMERS }, (_, i) => {
    const company = faker.company.name();
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const domain = company.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 18) || "company";
    return {
      id: randomUUID(),
      name: company,
      email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + `${i}@${domain}.in`,
      company,
      phone: faker.phone.number({ style: "international" }),
      address: `${faker.location.streetAddress()}, ${pick(["Bengaluru", "Mumbai", "Pune", "Delhi", "Hyderabad", "Chennai", "Kochi"])}`,
      createdAt: faker.date.between({ from: "2024-11-01", to: "2026-10-25" }),
    };
  });
  // The demo customer login owns a recognisable account.
  customerRows[0] = { ...customerRows[0], name: "Iyer Design Studio", company: "Iyer Design Studio", email: "customer@loop.test" };
  await insert(s.customers, customerRows);

  // Demo logins live in Supabase Auth, already confirmed; their profiles link them to roles.
  for (const u of DEMO_USERS) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: u.name } });
    if (error) throw new Error(`Couldn't create ${u.email}: ${error.message}`);
    await db.insert(s.profiles).values({ id: data.user.id, email: u.email, name: u.name, role: u.role, customerId: u.role === "customer" ? customerRows[0].id : null });
  }

  // ── Subscriptions, invoices, payments ──────────────────────────────────────
  const subs: Record<string, unknown>[] = [];
  const subLines: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
  const invs: (Record<string, unknown> & { issueDate: string; id: string })[] = [];
  const invLines: Record<string, unknown>[] = [];
  const pays: Record<string, unknown>[] = [];

  const weightedPlan = () => {
    let r = faker.number.float() * planSeeds.reduce((a, p) => a + p.weight, 0);
    for (const p of planSeeds) if ((r -= p.weight) <= 0) return p;
    return planSeeds[0];
  };

  for (let n = 1; n <= SUBSCRIPTIONS; n++) {
    const customer = n <= 3 ? customerRows[0] : pick(customerRows);
    const plan = weightedPlan();
    const id = randomUUID();
    const roll = faker.number.float();
    let status: string =
      roll < 0.7 ? "active" : roll < 0.79 ? "closed" : roll < 0.84 ? "paused" : roll < 0.91 ? "quotation" : roll < 0.96 ? "draft" : "confirmed";
    if (plan.period === "weekly" && status === "active" && chance(0.5)) status = "closed";

    const lookbackDays = plan.period === "weekly" ? 70 : plan.period === "yearly" ? 700 : 560;
    const startDate =
      status === "draft" || status === "quotation" || status === "confirmed"
        ? addDays(now, faker.number.int({ min: 0, max: 30 }))
        : addDays(now, -faker.number.int({ min: 20, max: lookbackDays }));
    const expiryDate = plan.termMonths ? addPeriod(startDate, "monthly", plan.termMonths) : null;

    // Lines: the plan's base product with quantity, plus optional add-ons.
    const qty = Math.max(plan.minQty, plan.minQty + faker.number.int({ min: 0, max: plan.minQty > 3 ? 20 : 4 }));
    // The plan line has no product; extra products follow it (same shape the app creates).
    const lines: { productId: string | null; variantId?: string; description: string; qty: number; unitPrice: number }[] = [
      { productId: null, description: plan.name, qty, unitPrice: plan.price },
    ];
    if (chance(0.3)) {
      const variant = pick([V.odoo, V.sap, V.tally]);
      lines.push({
        productId: P.connector,
        variantId: variant,
        description: `ERP Connector (${variantName[variant]})`,
        qty: 1,
        unitPrice: rupees(999) + variantPrice[variant],
      });
    }
    if (chance(0.25)) lines.push({ productId: P.storage, description: "Extra Storage 100 GB", qty: faker.number.int({ min: 1, max: 3 }), unitPrice: rupees(299) });
    if (plan.period === "yearly" && chance(0.3)) lines.push({ productId: P.support, description: "Priority Support", qty: 1, unitPrice: rupees(1999) * 12 });

    const periodTotal = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
    const discountId = qty >= 10 && chance(0.5) ? D.seats : null;
    const discountFor = (subtotal: number) => (discountId ? Math.round(subtotal * 0.1) : 0);
    const mrr = Math.round((periodTotal - discountFor(periodTotal)) * monthlyFactor(plan.period));

    for (const l of lines) subLines.push({ id: randomUUID(), subscriptionId: id, ...l });

    // Walk billing periods from start until today (or close / pause).
    let periodStart = startDate;
    let nextInvoiceDate: string | null = null;
    const billable = status === "active" || status === "closed" || status === "paused";
    const stopAt =
      status === "closed"
        ? addDays(now, -faker.number.int({ min: 5, max: 120 }))
        : status === "paused"
          ? addDays(now, -faker.number.int({ min: 10, max: 60 }))
          : now;
    // ~4% of active subs are left un-billed for their current period, so Billing Day has work to do.
    const leaveCurrentUnbilled = status === "active" && chance(0.04);

    if (billable) {
      while (periodStart <= stopAt && (!expiryDate || periodStart < expiryDate)) {
        const periodEnd = addDays(addPeriod(periodStart, plan.period), -1);
        const isCurrent = addPeriod(periodStart, plan.period) > now;
        if (isCurrent && leaveCurrentUnbilled) break;

        const invId = randomUUID();
        const subtotal = periodTotal;
        const discount = discountFor(subtotal);
        const tax = Math.round(((subtotal - discount) * TAX_BPS) / 10_000);
        const total = subtotal - discount + tax;
        const issueDate = periodStart;
        const terms = plan.period === "yearly" ? 30 : 15;
        const dueDate = addDays(issueDate, terms);
        const age = (Date.parse(now) - Date.parse(dueDate)) / 86_400_000;

        // Older invoices are almost all paid; recent ones are mixed; a few are overdue.
        let invStatus = "paid";
        let paid = total;
        const r = faker.number.float();
        if (age < -10) {
          invStatus = r < 0.35 ? "paid" : "confirmed";
        } else if (age < 0) {
          invStatus = r < 0.6 ? "paid" : "confirmed";
        } else if (age < 60) {
          invStatus = r < 0.94 ? "paid" : "confirmed";
        } else {
          invStatus = r < 0.99 ? "paid" : r < 0.996 ? "confirmed" : "cancelled";
        }
        if (invStatus === "confirmed") paid = chance(0.15) ? Math.round(total * 0.5) : 0;
        if (invStatus === "cancelled") paid = 0;

        invs.push({
          id: invId,
          number: "",
          subscriptionId: id,
          customerId: customer.id,
          status: invStatus,
          periodStart,
          periodEnd,
          issueDate,
          dueDate,
          subtotal,
          discountTotal: discount,
          taxTotal: tax,
          total,
          amountPaid: paid,
          discountId: discount ? discountId : null,
          sentAt: new Date(issueDate + "T09:00:00Z"),
        });
        for (const l of lines) {
          const amount = l.qty * l.unitPrice;
          invLines.push({
            invoiceId: invId,
            productId: l.productId,
            description: l.description,
            qty: l.qty,
            unitPrice: l.unitPrice,
            taxRateBps: TAX_BPS,
            taxAmount: Math.round((amount * TAX_BPS) / 10_000),
            amount,
          });
        }
        if (discount) {
          invLines.push({ invoiceId: invId, description: "10% off for 10+ seats", qty: 1, unitPrice: -discount, discount, amount: -discount });
        }
        if (paid > 0) {
          const paidOn = addDays(issueDate, faker.number.int({ min: 1, max: Math.max(2, Math.min(terms + 10, Math.floor((Date.parse(now) - Date.parse(issueDate)) / 86_400_000))) }));
          pays.push({
            invoiceId: invId,
            method: pick(["bank", "bank", "bank", "upi", "card", "cheque"] as const),
            amount: paid,
            paidOn: paidOn > now ? now : paidOn,
            note: chance(0.3) ? pick(["NEFT", "Paid via portal", "Partial — balance next week", "Cheque cleared", "UPI ref"]) : null,
            source: "manual",
          });
        }
        periodStart = addPeriod(periodStart, plan.period);
      }
      nextInvoiceDate = status === "active" ? periodStart : null;
    }

    const createdAt = new Date(addDays(startDate, -faker.number.int({ min: 1, max: 10 })) + "T10:00:00Z");
    subs.push({
      id,
      number: `SUB-${String(n).padStart(5, "0")}`,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate,
      expiryDate,
      nextInvoiceDate,
      paymentTermsDays: plan.period === "yearly" ? 30 : 15,
      quoteValidUntil: status === "quotation" ? addDays(now, 14) : null,
      discountId,
      mrr: status === "active" ? mrr : 0,
      createdAt: createdAt > new Date() ? new Date() : createdAt,
    });

    // Timeline events, also used for MRR movement (new / churn).
    if (billable) {
      events.push({ subscriptionId: id, fromStatus: null, toStatus: "active", mrrDelta: mrr, at: new Date(startDate + "T10:00:00Z"), note: "Activated" });
      if (status === "closed") events.push({ subscriptionId: id, fromStatus: "active", toStatus: "closed", mrrDelta: -mrr, at: new Date(stopAt + "T10:00:00Z"), note: "Closed" });
      if (status === "paused") events.push({ subscriptionId: id, fromStatus: "active", toStatus: "paused", mrrDelta: -mrr, at: new Date(stopAt + "T10:00:00Z"), note: "Paused by customer" });
    } else {
      events.push({ subscriptionId: id, fromStatus: null, toStatus: status, mrrDelta: 0, at: createdAt, note: "Created" });
    }
  }

  // Invoice numbers follow issue order.
  invs.sort((a, b) => (a.issueDate < b.issueDate ? -1 : a.issueDate > b.issueDate ? 1 : 0));
  const counters: Record<string, number> = {};
  for (const inv of invs) {
    const year = inv.issueDate.slice(0, 4);
    counters[year] = (counters[year] ?? 0) + 1;
    inv.number = `INV-${year}-${String(counters[year]).padStart(6, "0")}`;
  }

  await insert(s.subscriptions, subs);
  await insert(s.subscriptionLines, subLines);
  await insert(s.subscriptionEvents, events);
  await insert(s.invoices, invs, 1000);
  await insert(s.invoiceLines, invLines, 2000);
  await insert(s.payments, pays, 2000);
  const seatUses = invs.filter((i) => i.discountId === D.seats).length;
  await db.update(s.discounts).set({ timesUsed: Math.min(500, seatUses) }).where(eq(s.discounts.id, D.seats));

  console.log(
    `Seeded ${customerRows.length} customers, ${subs.length} subscriptions, ${invs.length} invoices, ` +
      `${invLines.length} invoice lines, ${pays.length} payments in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
  console.log(`Logins (password ${DEMO_PASSWORD}): ${DEMO_USERS.map((u) => u.email).join(", ")}`);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
