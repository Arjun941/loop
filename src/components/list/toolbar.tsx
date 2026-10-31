"use client";

import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useList } from "./list-state";

export type Segment = { value: string; label: string };

export function ListToolbar({ segments, placeholder = "Search" }: { segments?: Segment[]; placeholder?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {segments ? <SegmentedControl segments={segments} /> : <span />}
      <SearchField placeholder={placeholder} />
    </div>
  );
}

export function ToolbarShell({ segments }: { segments?: Segment[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {segments ? (
        <div className="flex h-9 rounded-[11px] bg-neutral-soft p-[3px]">
          {segments.map((s, i) => (
            <span
              key={s.value}
              className={cn(
                "flex items-center rounded-[8px] px-3 text-[13px] font-medium text-muted",
                i === 0 && "bg-surface text-fg shadow-sm",
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      ) : (
        <span />
      )}
      <div className="h-9 w-full rounded-[10px] bg-surface shadow-sm sm:w-64" />
    </div>
  );
}

function SegmentedControl({ segments }: { segments: Segment[] }) {
  const params = useSearchParams();
  const { setParams } = useList();
  const current = params.get("status") ?? segments[0].value;
  // Highlight moves on click; it resyncs whenever the URL settles on a value.
  const [optimistic, setOptimistic] = useState(current);
  const [synced, setSynced] = useState(current);
  if (synced !== current) {
    setSynced(current);
    setOptimistic(current);
  }
  const layoutId = useId();

  return (
    <div role="tablist" className="flex h-9 max-w-full overflow-x-auto rounded-[11px] bg-neutral-soft p-[3px]">
      {segments.map((s) => {
        const active = optimistic === s.value;
        return (
          <button
            key={s.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              setOptimistic(s.value);
              setParams({ status: s.value === segments[0].value ? null : s.value });
            }}
            className={cn(
              "relative flex items-center rounded-[8px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[8px] bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchField({ placeholder }: { placeholder: string }) {
  const params = useSearchParams();
  const { setParams } = useList();
  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(v: string) {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setParams({ q: v.trim() || null }), 220);
  }

  return (
    <label className="group relative flex h-9 w-full items-center sm:w-64">
      <Search className="pointer-events-none absolute left-3 size-4 text-subtle" />
      <input
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-[10px] bg-surface pr-8 pl-9 text-sm shadow-sm outline-none transition-shadow placeholder:text-subtle focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]"
      />
      {value && (
        <button
          aria-label="Clear search"
          onClick={() => update("")}
          className="absolute right-2 grid size-5 place-items-center rounded-full bg-neutral-soft text-muted hover:text-fg"
        >
          <X className="size-3" />
        </button>
      )}
    </label>
  );
}
