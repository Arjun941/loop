# Loop

Subscription billing that runs itself: products and plans, quotes, subscriptions, invoices, payments and revenue reporting in one place. Next.js 16 (App Router, Cache Components) · Supabase (Postgres + Auth) · Drizzle · Resend.

**Live:** https://loop-two-kappa.vercel.app · **Walkthrough video:** [loop-guide.mp4](https://github.com/Arjun941/loop/releases/tag/guide-video)

## Run it

1. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in the Supabase URL,
   publishable key, secret key and the **Session pooler** connection string (port 5432; the transaction pooler on 6543 stalls on pages that run several queries at once).
2. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/**` to Redirect URLs.

```bash
npm install
npm run db:reset             # migrates, then seeds ~8k subscriptions and three demo logins (wipes app data)
npm run dev
npm test                     # unit tests for pricing and the subscription lifecycle
```

Other commands: `npm run db:migrate` applies new migrations without touching data; `npm run db:generate` creates a migration after a schema change.

The seed creates a demo business, Acme Inc. (rename it in Settings or `company_settings`). Demo logins (password `LoopDemo@2026`):

| Email | Role | Lands on |
|---|---|---|
| `admin@loop.test` | Admin | Back office, can invite staff |
| `staff@loop.test` | Staff | Back office |
| `customer@loop.test` | Customer | `/portal` (Iyer Design Studio) |

### Auth

Supabase Auth handles sign-up, sign-in, password reset, staff invites and Google. The app keeps a `profiles` row per
login with the person's role (admin, staff, customer) and, for customers, their customer record.

- **Google:** in Supabase → Authentication → Providers → Google, add a Google OAuth client ID and secret. Supabase shows the
  callback URL to register in Google Cloud. A first Google sign-in creates a customer account.
- **Auth emails** (confirmation, reset, invite): Supabase makes the one-time link (`auth.admin.generateLink`) and the app
  sends it with its own templates, through Resend, or into Settings → Emails (the Outbox) without a `RESEND_API_KEY`. So they
  work in any browser and skip Supabase's built-in sender, which is rate limited and only mails your Supabase team.
- **Email confirmation:** if it's on (the Supabase default), new customers confirm their email before signing in. Switch it
  off under Authentication → Sign In / Providers → Email to sign customers straight in.

Every table has Row Level Security on with no policies, so Supabase's public Data API can't read billing data. The server
connects directly with the database password and isn't affected.

App emails (quotations, invoices) go through Resend. Without `RESEND_API_KEY` they're kept in **Settings → Emails** (the Outbox).

## Billing, payments and reporting

- **Billing day** (`/billing`): previews every invoice a run would create (taxes and discounts applied, catch-up periods,
  discounts that ran out, subscriptions closing at expiry), then creates and emails them in one go. A period is never billed
  twice: the database rejects a second invoice for the same subscription and period, and re-runs report what they skipped.
- **Nightly job**: `GET /api/cron/daily` (scheduled in `vercel.json`, protected by `CRON_SECRET`) bills everything due and
  sends reminders: overdue at 1, 7 and 14 days, renewals 14 days before expiry. Each reminder stage is sent once.
- **Payments**: record full or partial payments on an invoice; it becomes Paid when covered. **Match bank statement**
  (`/payments/reconcile`) reads a bank CSV and matches lines to invoices by invoice number, customer name and amount;
  confident matches apply in one click. "Try a sample statement" builds one from your open invoices.
- **Home** (`/dashboard`): MRR and its movement (new, resumed, paused, churned), billed vs collected, outstanding,
  overdue by age, and revenue at risk, filterable by period and plan.

## Connect an LLM (MCP)

Loop serves a Model Context Protocol server at `/api/mcp` (Streamable HTTP). An admin creates an API key in
**Settings → API & MCP**; the key acts as that admin, with the same rules as the app. Tools: `get_overview`,
`search_customers`, `list_subscriptions`, `get_subscription`, `list_invoices`, `get_invoice`, `get_catalog`,
`preview_billing`, `create_customer`, `create_subscription`, `subscription_action`, `invoice_action`, `record_payment`,
`run_billing`, `send_reminders`.

```bash
claude mcp add --transport http loop http://localhost:3000/api/mcp --header "Authorization: Bearer loop_sk_…"
```

The settings page also has copy-ready config for Claude Desktop and Cursor.

## How the code is organised

```
src/
  app/
    (auth)/            sign in, sign up, forgot and reset password + their server actions
    (app)/             back office for admin and staff (one folder per page)
    portal/            customer self-service
  components/
    ui/                design system: buttons, cards, tables, sheet, page + reveal transitions
    list/              URL-driven list pages (filters, search, pagination)
    shell/             sidebar, top bar, command bar, user menu
    auth/              sign-in layout, brand panel, password strength, Google button
    form/              inputs, select, switch, segmented control, field + error layout
    catalog/           list cards, editor sheet helpers, archive with undo, row editor
  lib/                 pure helpers shared by client and server (money, dates, validation)
    domain/            business rules with tests: pricing, subscription and invoice lifecycles, billing periods, bank matching
  server/              server-only code
    auth/              Supabase clients, accounts and profiles, access rules (requireStaff, requireAdmin, …)
    db/                schema, connection, migrate and seed scripts
    email/             sendEmail() and React Email templates
    queries/           read queries, one module per area; each starts with an access check
    services/          multi-step writes with their rules: subscriptions, billing engine, invoices, reminders, reconciliation
    mcp/               MCP tools and API keys
  app/auth/            /auth/callback (finishes every email or Google sign-in) and /auth/google
  proxy.ts             refreshes the Supabase session; redirects signed-out visitors to /login
```

Conventions:

- **Authorization lives on the server.** Every query and action calls `requireStaff`, `requireAdmin` or `requireCustomer` first; the UI only hides what a role can't use.
- **Money is integer paise** and dates are `YYYY-MM-DD` strings; `lib/format.ts` and `lib/dates.ts` are the only places that convert them.
- **One set of rules.** `lib/domain/*` is pure and unit tested; the UI uses it to preview and decide which buttons to show, the server uses it to enforce.
- **Validation is shared.** `lib/validation/*` schemas drive both live form feedback and server checks.
- **Pages stream.** Each page renders its frame instantly and wraps data in `<Reveal>` (Suspense + a view transition).

Build plan and phases: `../PLAN.md`.
