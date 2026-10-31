"use client";
/**
 * Feature highlights as a bento grid. Each card carries a small working picture of the feature
 * that plays once when it scrolls into view. Figures are illustrative.
 */
import { Pill } from "@/components/ui/status";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Download, FileUp, Mail, Play } from "lucide-react";
import { motion, useInView, type Variants } from "motion/react";
import { useRef, type ReactNode } from "react";
import { EASE, Reveal } from "./motion";
import { SectionHeading } from "./section-heading";

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Built for the whole billing month."
        body="From the first of the month to the last payment in, each part of the job has a place in Loop."
      />

      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2" amount={0.2}>
          <BillingDayCard />
        </Reveal>
        <Reveal delay={0.08} amount={0.2}>
          <MatchingCard />
        </Reveal>
        <Reveal amount={0.2}>
          <PortalCard />
        </Reveal>
        <Reveal className="lg:col-span-2" delay={0.08} amount={0.2}>
          <MovementCard />
        </Reveal>
        <Reveal className="lg:col-span-3" amount={0.2}>
          <RemindersCard />
        </Reveal>
      </div>
    </section>
  );
}

function FeatureCard({ title, body, children, className }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <article className={cn("flex h-full flex-col overflow-hidden rounded-[28px] bg-surface shadow-sm", className)}>
      <div className="p-7 pb-0 sm:p-8 sm:pb-0">
        <h3 className="text-[21px] font-semibold tracking-[-0.025em]">{title}</h3>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">{body}</p>
      </div>
      <div className="mt-auto p-4 pt-7 sm:p-5 sm:pt-8">{children}</div>
    </article>
  );
}

/** Plays its children's `hidden` → `shown` variants once the box is in view. */
function Sequence({ children, className, stagger = 0.12, delay = 0.2 }: { children: ReactNode; className?: string; stagger?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/* ── Billing Day ─────────────────────────────────────────────────────────── */

const PREVIEW = [
  { name: "Iyer Design Studio", plan: "Studio · Yearly", discount: "10%", total: "₹2,83,200" },
  { name: "Northwind Labs", plan: "Team · Monthly", discount: "—", total: "₹9,440" },
  { name: "Kavya Foods", plan: "Growth · Monthly", discount: "—", total: "₹18,880" },
  { name: "Meridian Health", plan: "Enterprise · Quarterly", discount: "5%", total: "₹1,41,600" },
];

function BillingDayCard() {
  return (
    <FeatureCard
      title="Billing day, previewed."
      body="See every invoice before it exists: who’s billed, how much, with discounts and GST worked out. Run it, and anything already billed is skipped."
    >
      <div className="overflow-hidden rounded-[20px] bg-surface-2 ring-1 ring-line">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-line px-4 py-2.5 text-[11.5px] font-medium text-subtle sm:grid-cols-[minmax(0,1.4fr)_70px_110px]">
          <span>Customer</span>
          <span className="hidden sm:block">Discount</span>
          <span className="text-right">Total</span>
        </div>
        <Sequence>
          {PREVIEW.map((r) => (
            <motion.div
              key={r.name}
              variants={fadeUp}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-4 py-3 sm:grid-cols-[minmax(0,1.4fr)_70px_110px]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium">{r.name}</span>
                <span className="block truncate text-[12px] text-muted">{r.plan}</span>
              </span>
              <span className="hidden text-[13px] text-muted tabular sm:block">{r.discount}</span>
              <span className="text-right text-[13.5px] font-medium tabular">{r.total}</span>
            </motion.div>
          ))}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-4 py-3 opacity-60 sm:grid-cols-[minmax(0,1.4fr)_70px_110px]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium">Blue Fern Co.</span>
              <span className="block truncate text-[12px] text-muted">Team · Monthly</span>
            </span>
            <span className="hidden sm:block" />
            <span className="flex justify-end">
              <Pill className="whitespace-nowrap">Already billed</Pill>
            </span>
          </motion.div>
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[12.5px] text-muted">
              <span className="font-medium text-fg">4 to create</span> · 1 skipped
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12.5px] font-medium text-accent-fg">
              <Play className="size-3 fill-current" /> Run billing
            </span>
          </motion.div>
        </Sequence>
      </div>
    </FeatureCard>
  );
}

/* ── Bank matching ───────────────────────────────────────────────────────── */

const LINES = [
  { ref: "UPI/IYERDESIGN", amount: "₹2,83,200", invoice: "INV-0412" },
  { ref: "NEFT/NORTHWIND", amount: "₹9,440", invoice: "INV-0415" },
  { ref: "IMPS/KAVYA FOODS", amount: "₹18,880", invoice: "INV-0418" },
  { ref: "NEFT/A SHARMA", amount: "₹3,150", invoice: null },
];

const matchIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  shown: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } },
};
const linkIn: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.35, ease: EASE } },
};

function MatchingCard() {
  return (
    <FeatureCard
      title="Bank statements, matched."
      body="Upload the CSV from your bank. Loop pairs each payment with its invoice and leaves anything unclear for you."
    >
      <div className="rounded-[20px] bg-surface-2 p-3 ring-1 ring-line">
        <div className="flex items-center gap-2 px-1.5 pt-0.5 pb-3 text-[12px] text-muted">
          <FileUp className="size-3.5" /> statement-oct.csv
        </div>
        <Sequence className="space-y-1.5" stagger={0.35} delay={0.4}>
          {LINES.map((l) => (
            <motion.div key={l.ref} variants={{ hidden: {}, shown: {} }} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[11px] text-muted">{l.ref}</span>
                <span className="block text-[13px] font-medium tabular">{l.amount}</span>
              </span>
              <motion.span variants={linkIn} className="h-px w-4 origin-left bg-line-strong" />
              <motion.span variants={matchIn}>
                {l.invoice ? (
                  <Pill tone="success">
                    <Check className="size-3" strokeWidth={3} /> {l.invoice}
                  </Pill>
                ) : (
                  <Pill tone="warning">Review</Pill>
                )}
              </motion.span>
            </motion.div>
          ))}
        </Sequence>
        <div className="flex items-center justify-between px-1.5 pt-3 pb-0.5 text-[12px] text-muted">
          <span>
            <span className="font-medium text-fg">3 matched</span> · 1 to review
          </span>
          <span className="tabular">₹3,11,520</span>
        </div>
      </div>
    </FeatureCard>
  );
}

/* ── Customer portal ─────────────────────────────────────────────────────── */

function PortalCard() {
  return (
    <FeatureCard
      title="A portal for customers."
      body="Customers see their plan, download invoices and pay what’s due. Admins, staff and customers each see just what they need."
    >
      <Sequence className="rounded-[20px] bg-surface-2 p-4 ring-1 ring-line">
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">ID</span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium">Iyer Design Studio</span>
            <span className="block truncate text-[12px] text-muted">Studio plan · Yearly</span>
          </span>
        </motion.div>
        <motion.div variants={fadeUp} className="mt-4 rounded-2xl bg-surface p-3.5 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted">Next invoice</span>
            <Pill tone="accent">1 Nov 2027</Pill>
          </div>
          <div className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] tabular">₹2,83,200</div>
        </motion.div>
        <motion.div variants={fadeUp} className="mt-3 grid grid-cols-2 gap-2">
          <span className="inline-flex h-9 items-center justify-center rounded-[10px] bg-accent text-[13px] font-medium text-accent-fg">
            Pay now
          </span>
          <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface text-[13px] font-medium ring-1 ring-line">
            <Download className="size-3.5" /> Invoices
          </span>
        </motion.div>
      </Sequence>
    </FeatureCard>
  );
}

/* ── Revenue movement ────────────────────────────────────────────────────── */

const MOVES = [
  { label: "Start", value: "₹3.78 Cr", from: 3.5, to: 3.78, kind: "total" },
  { label: "New", value: "+₹21 L", from: 3.78, to: 3.99, kind: "up" },
  { label: "Expansion", short: "Expand", value: "+₹7 L", from: 3.99, to: 4.06, kind: "up" },
  { label: "Contraction", short: "Contract", value: "−₹3 L", from: 4.03, to: 4.06, kind: "down" },
  { label: "Churn", value: "−₹9 L", from: 3.94, to: 4.03, kind: "down" },
  { label: "End", value: "₹3.94 Cr", from: 3.5, to: 3.94, kind: "total" },
] as const;
const MIN = 3.5;
const MAX = 4.12;
const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100;
const BAR = { total: "bg-accent", up: "bg-success", down: "bg-danger" } as const;

const barIn: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  shown: { scaleY: 1, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

function MovementCard() {
  return (
    <FeatureCard
      title="Revenue movement, at a glance."
      body="Where this month’s MRR came from and where it went: new business, expansion, contraction and churn. Plus the revenue at risk from overdue invoices."
    >
      <div className="rounded-[20px] bg-surface-2 p-4 ring-1 ring-line sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium">MRR movement · October</span>
          <Pill tone="warning">₹6.8 L at risk</Pill>
        </div>
        <Sequence className="mt-5 grid grid-cols-6 gap-1 sm:gap-4" stagger={0.14}>
          {MOVES.map((m) => (
            <div key={m.label} className="min-w-0">
              <div className="relative h-36 sm:h-44">
                <motion.div
                  variants={barIn}
                  className={cn("absolute inset-x-0 rounded-md", BAR[m.kind], m.kind === "down" ? "origin-top" : "origin-bottom")}
                  style={{ bottom: `${pct(m.from)}%`, height: `${pct(m.to) - pct(m.from)}%` }}
                />
                <motion.span
                  variants={fadeUp}
                  className="absolute inset-x-0 text-center text-[10.5px] font-medium whitespace-nowrap text-fg tabular sm:text-[12px]"
                  style={{ bottom: `calc(${pct(m.to)}% + 6px)` }}
                >
                  {m.value}
                </motion.span>
              </div>
              <div className="mt-2 border-t border-line pt-2 text-center text-[10px] whitespace-nowrap text-muted sm:text-[12px]">
                {"short" in m ? (
                  <>
                    <span className="sm:hidden">{m.short}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </>
                ) : (
                  m.label
                )}
              </div>
            </div>
          ))}
        </Sequence>
      </div>
    </FeatureCard>
  );
}

/* ── Reminders ───────────────────────────────────────────────────────────── */

const REMINDERS = [
  { when: "7 days before", what: "Renewal reminder", who: "Kavya Foods", tone: "accent" as const },
  { when: "Due today", what: "Payment due", who: "Northwind Labs", tone: "neutral" as const },
  { when: "3 days late", what: "Overdue reminder", who: "Meridian Health", tone: "warning" as const },
];

function RemindersCard() {
  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-[28px] bg-surface shadow-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] lg:items-center">
      <div className="p-7 sm:p-8 lg:py-10">
        <h3 className="text-[21px] font-semibold tracking-[-0.025em]">Reminders that never forget.</h3>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
          Renewal and overdue reminders go out on their own, so nothing depends on someone noticing. Every email is kept in the
          outbox.
        </p>
      </div>
      <Sequence className="grid gap-2.5 p-4 pt-0 sm:grid-cols-3 sm:p-5 lg:pt-5 lg:pl-0" stagger={0.18}>
        {REMINDERS.map((r, i) => (
          <motion.div key={r.what} variants={fadeUp} className="relative rounded-[20px] bg-surface-2 p-4 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
                <Mail className="size-4" />
              </span>
              <span className="flex items-center gap-1 text-[11.5px] font-medium text-success">
                <Check className="size-3.5" strokeWidth={2.8} /> Sent
              </span>
            </div>
            <div className="mt-4 text-[12px] text-muted">{r.when}</div>
            <div className="mt-0.5 text-[14px] font-medium">{r.what}</div>
            <div className="mt-3">
              <Pill tone={r.tone}>{r.who}</Pill>
            </div>
            {i < REMINDERS.length - 1 && (
              <ArrowRight className="absolute top-1/2 -right-[13px] z-10 hidden size-3.5 -translate-y-1/2 text-subtle sm:block" />
            )}
          </motion.div>
        ))}
      </Sequence>
    </article>
  );
}
