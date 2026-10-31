"use client";
/**
 * Where a subscription is on its path: Draft → Quotation → Confirmed → Active → Closed.
 * The filled line grows to the current step; Paused shows as an amber Active.
 */
import { STATUS_LABEL, STATUS_PATH, type SubscriptionStatus } from "@/lib/domain/subscription-status";
import { cn } from "@/lib/utils";
import { Check, Pause } from "lucide-react";
import { motion } from "motion/react";

export function StatusStepper({ status }: { status: SubscriptionStatus }) {
  const position = STATUS_PATH.indexOf(status === "paused" ? "active" : status);
  const progress = position / (STATUS_PATH.length - 1);

  return (
    <div className="relative px-3" aria-label={`Status: ${STATUS_LABEL[status]}`}>
      <div className="absolute top-[13px] right-[calc(10%+12px)] left-[calc(10%+12px)] h-[2px] rounded-full bg-neutral-soft">
        <motion.div
          className={cn("h-full rounded-full", status === "paused" ? "bg-warning" : status === "closed" ? "bg-subtle" : "bg-accent")}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <ol className="relative grid grid-cols-5">
        {STATUS_PATH.map((step, i) => {
          const done = i < position || status === "closed";
          const current = i === position;
          const paused = current && status === "paused";
          return (
            <li key={step} className="flex flex-col items-center gap-2">
              <motion.span
                initial={false}
                animate={{ scale: current ? 1.08 : 1 }}
                className={cn(
                  "grid size-[28px] place-items-center rounded-full border-2 bg-surface text-[11px] font-semibold transition-colors duration-300",
                  paused
                    ? "border-warning bg-warning text-white"
                    : current && status !== "closed"
                      ? "border-accent bg-accent text-white shadow-[0_0_0_5px_var(--accent-soft)]"
                      : done
                        ? "border-accent bg-accent text-white"
                        : "border-line-strong text-subtle",
                  status === "closed" && "border-subtle bg-subtle",
                )}
              >
                {paused ? <Pause className="size-3" fill="currentColor" /> : done || current ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </motion.span>
              <span className={cn("text-[12px] font-medium", current ? "text-fg" : "text-muted")}>{paused ? "Paused" : STATUS_LABEL[step]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
