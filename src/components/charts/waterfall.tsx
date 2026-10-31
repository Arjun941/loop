"use client";
/**
 * Revenue movement as a waterfall: where monthly recurring revenue started, what was added
 * and lost, and where it ended. Gains rise in blue, losses fall in orange, totals are neutral;
 * every bar is labelled so the colour is never the only cue.
 */
import { money } from "@/lib/format";
import { motion } from "motion/react";
import { useState } from "react";
import { niceMax, Tooltip, useWidth, type Tip } from "./chart-kit";

export type Step = { label: string; amount: number; count?: number; kind: "total" | "delta" };

/** Where each bar starts and ends: totals sit on zero, deltas float from the running total. */
function layoutSteps(steps: Step[]) {
  const out: (Step & { from: number; to: number })[] = [];
  let running = 0;
  for (const s of steps) {
    const from = s.kind === "total" ? 0 : running;
    running = s.kind === "total" ? s.amount : running + s.amount;
    out.push({ ...s, from, to: running });
  }
  return out;
}

const H = 230;
const TOP = 26;
const BOTTOM = 34;

export function Waterfall({ steps }: { steps: Step[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);

  const bars = layoutSteps(steps);
  const max = niceMax(Math.max(...bars.map((b) => Math.max(b.from, b.to))));
  const plot = H - TOP - BOTTOM;
  const y = (v: number) => TOP + plot - (Math.max(0, v) / max) * plot;
  const slot = width / Math.max(1, bars.length);
  const barW = Math.min(56, slot * 0.56);

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Monthly recurring revenue movement">
          {[0.5, 1].map((g) => (
            <line key={g} x1={0} x2={width} y1={y(max * g)} y2={y(max * g)} stroke="var(--line)" />
          ))}
          <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
          {bars.map((b, i) => {
            const cx = slot * i + slot / 2;
            const top = y(Math.max(b.from, b.to));
            const height = Math.max(2, Math.abs(y(b.from) - y(b.to)));
            const color = b.kind === "total" ? "var(--chart-neutral)" : b.amount >= 0 ? "var(--series-1)" : "var(--series-2)";
            const next = bars[i + 1];
            return (
              <g
                key={b.label}
                onMouseMove={(e) =>
                  setTip({
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    content: (
                      <>
                        <div className="font-medium">{b.label}</div>
                        <div className="text-muted tabular">
                          {b.kind === "delta" && b.amount > 0 ? "+" : ""}
                          {money(b.amount, { whole: true })} / month
                        </div>
                        {b.count !== undefined && <div className="text-muted tabular">{b.count} subscriptions</div>}
                      </>
                    ),
                  })
                }
              >
                <rect x={slot * i} y={TOP} width={slot} height={plot} fill="transparent" />
                <motion.rect
                  x={cx - barW / 2}
                  width={barW}
                  rx={4}
                  fill={color}
                  initial={{ y: y(0), height: 0 }}
                  animate={{ y: top, height }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 160, damping: 22 }}
                />
                {next && (
                  <line x1={cx + barW / 2} x2={slot * (i + 1) + slot / 2 - barW / 2} y1={y(b.to)} y2={y(b.to)} stroke="var(--line-strong)" strokeDasharray="3 3" />
                )}
                <text x={cx} y={top - 8} textAnchor="middle" className="fill-fg text-[11.5px] font-medium tabular">
                  {b.kind === "delta" && b.amount > 0 ? "+" : ""}
                  {money(b.amount, { compact: true })}
                </text>
                <text x={cx} y={H - 12} textAnchor="middle" className="fill-muted text-[11.5px]">
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}
