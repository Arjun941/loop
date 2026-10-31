"use client";
/**
 * Small shared pieces for the hand-built charts: measuring the container,
 * a hover tooltip, and a legend. Chart colours come from the --series-* tokens
 * (validated for colour-blind separation in light and dark).
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Width of an element, kept current as it resizes. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export type Tip = { x: number; y: number; content: ReactNode } | null;

/** Positioned over the chart; flips left near the right edge so it never overflows. */
export function Tooltip({ tip, width }: { tip: Tip; width: number }) {
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute z-10 min-w-[150px] rounded-xl bg-surface px-3 py-2 text-[12.5px] shadow-lg"
          style={{ left: tip.x > width - 170 ? tip.x - 160 : tip.x + 12, top: Math.max(0, tip.y - 12) }}
        >
          {tip.content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-[12.5px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Rounds a max value up to a tidy axis ceiling. */
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}
