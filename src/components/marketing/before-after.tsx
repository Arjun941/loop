"use client";
/**
 * Five chores Loop takes over. Each row strikes through the old way, then brings in the new one.
 */
import { ArrowRight, BarChart3, CalendarClock, FileSpreadsheet, FileText, Landmark } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { EASE } from "./motion";
import { SectionHeading } from "./section-heading";

const ROWS = [
  {
    icon: FileSpreadsheet,
    before: "A spreadsheet of who pays for what",
    after: "One record per subscription, from first quote to close",
  },
  {
    icon: CalendarClock,
    before: "Renewals remembered by whoever notices",
    after: "Renewal and overdue reminders go out on their own",
  },
  {
    icon: FileText,
    before: "Invoices typed up by hand",
    after: "Invoices created on billing day, taxes and discounts applied, never twice",
  },
  {
    icon: Landmark,
    before: "Payments matched by scrolling bank statements",
    after: "Upload the statement and Loop matches payments to invoices",
  },
  {
    icon: BarChart3,
    before: "Revenue reports built once a quarter",
    after: "MRR, its movement and revenue at risk, always current",
  },
];

const row: Variants = { hidden: {}, shown: {} };
const strike: Variants = {
  hidden: { textDecorationColor: "rgba(128,128,128,0)" },
  shown: { textDecorationColor: "rgba(128,128,128,0.7)", transition: { duration: 0.5, delay: 0.25 } },
};
const after: Variants = {
  hidden: { opacity: 0, x: -10 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.7, delay: 0.45, ease: EASE } },
};
const arrow: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  shown: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.35, ease: EASE } },
};

export function BeforeAfter() {
  return (
    <section id="why" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <SectionHeading
        eyebrow="Before and after"
        title="The busywork, handled."
        body="Most billing work is the same few chores, every month. Loop does them, so your team can look after customers instead."
      />

      <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-[28px] bg-surface shadow-sm">
        {ROWS.map(({ icon: Icon, before, after: next }, i) => (
          <motion.div
            key={before}
            variants={row}
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, amount: 0.6 }}
            className={`grid items-center gap-x-6 gap-y-2 px-6 py-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.25fr)] ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-soft text-subtle">
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </span>
              <motion.span variants={strike} className="text-[15px] text-muted line-through decoration-[1.5px]">
                {before}
              </motion.span>
            </div>
            <motion.span variants={arrow} className="hidden size-7 place-items-center rounded-full bg-accent-soft text-accent md:grid">
              <ArrowRight className="size-3.5" strokeWidth={2.4} />
            </motion.span>
            <motion.p variants={after} className="pl-14 text-[16px] font-medium tracking-[-0.01em] text-fg md:pl-0 md:text-[17px]">
              {next}
            </motion.p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
