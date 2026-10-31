"use client";
/**
 * Overdue money by how late it is. One hue that deepens with age (older debts are harder to collect),
 * each bar labelled with its amount and invoice count.
 */
import { money, number } from "@/lib/format";
import { motion } from "motion/react";

const SHADES = [0.35, 0.55, 0.75, 1];

export function AgingBars({ buckets }: { buckets: { bucket: string; amount: number; count: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.amount));
  return (
    <ul className="flex flex-col gap-3.5">
      {buckets.map((b, i) => (
        <li key={b.bucket}>
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="text-muted">{b.bucket}</span>
            <span className="tabular">
              <span className="font-medium">{money(b.amount, { whole: true })}</span>
              <span className="text-muted"> · {number(b.count)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-soft">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--series-2)", opacity: SHADES[i] }}
              initial={{ width: 0 }}
              animate={{ width: `${(b.amount / max) * 100}%` }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
