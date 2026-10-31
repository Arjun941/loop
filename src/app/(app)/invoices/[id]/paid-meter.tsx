"use client";
/**
 * How much of an invoice has been paid, as a bar that fills in.
 */
import { money } from "@/lib/format";
import { motion } from "motion/react";

export function PaidMeter({ paid, total, cancelled }: { paid: number; total: number; cancelled: boolean }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const due = Math.max(0, total - paid);
  return (
    <div>
      <div className="text-[13px] text-muted">{cancelled ? "Cancelled" : due > 0 ? "Amount due" : "Paid in full"}</div>
      <div className="mt-1 text-[26px] leading-none font-semibold tracking-tight tabular">{money(cancelled ? 0 : due)}</div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-soft">
        <motion.div
          className="h-full rounded-full bg-success"
          initial={{ width: 0 }}
          animate={{ width: `${cancelled ? 0 : pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted tabular">
        <span>{money(paid)} paid</span>
        <span>of {money(total)}</span>
      </div>
    </div>
  );
}
