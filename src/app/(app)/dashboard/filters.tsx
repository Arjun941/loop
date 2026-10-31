"use client";
/**
 * Dashboard filters (time range and plan). They live in the URL, so a filtered view can be shared.
 */
import { Select } from "@/components/form/controls";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";

export function DashboardFilters({
  range,
  planId,
  ranges,
  plans,
  children,
}: {
  range: string;
  planId: string | null;
  ranges: Record<string, string>;
  plans: { id: string; name: string }[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimisticRange, setOptimisticRange] = useState(range);
  const [synced, setSynced] = useState(range);
  if (synced !== range) {
    setSynced(range);
    setOptimisticRange(range);
  }
  const layoutId = useId();

  function go(next: { range?: string; plan?: string | null }) {
    const params = new URLSearchParams();
    const r = next.range ?? range;
    const p = next.plan === undefined ? planId : next.plan;
    if (r !== "90d") params.set("range", r);
    if (p) params.set("plan", p);
    const qs = params.toString();
    start(() => router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false }));
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex h-9 max-w-full overflow-x-auto rounded-[11px] bg-neutral-soft p-[3px]">
          {Object.entries(ranges).map(([value, label]) => {
            const active = optimisticRange === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setOptimisticRange(value);
                  go({ range: value });
                }}
                className={cn("relative rounded-[8px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors", active ? "text-fg" : "text-muted hover:text-fg")}
              >
                {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-[8px] bg-surface shadow-sm" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="w-full sm:w-56">
          <Select aria-label="Plan" value={planId ?? ""} onChange={(e) => go({ plan: e.target.value || null })} className="h-9 rounded-[10px] text-[13px]">
            <option value="">All plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-55")} aria-busy={pending}>
        {children}
      </div>
    </>
  );
}
