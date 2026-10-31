"use client";
/**
 * Billed vs collected per month, as paired columns on one shared rupee axis.
 * Hovering a month shows both values.
 */
import { money } from "@/lib/format";
import { motion } from "motion/react";
import { useState } from "react";
import { Legend, niceMax, Tooltip, useWidth, type Tip } from "./chart-kit";

const H = 240;
const TOP = 12;
const BOTTOM = 28;
const LEFT = 52;

const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "short" });
const monthLong = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

export function BilledCollected({ data }: { data: { month: string; billed: number; collected: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.billed, d.collected])));
  const plot = H - TOP - BOTTOM;
  const plotW = Math.max(0, width - LEFT);
  const slot = plotW / data.length;
  const barW = Math.max(3, Math.min(14, slot * 0.3));
  const y = (v: number) => TOP + plot - (v / max) * plot;
  const showEvery = slot < 34 ? 2 : 1;

  return (
    <div className="flex flex-col gap-3">
      <Legend
        items={[
          { label: "Billed", color: "var(--series-1)" },
          { label: "Collected", color: "var(--series-2)" },
        ]}
      />
      <div
        ref={ref}
        className="relative"
        onMouseLeave={() => {
          setTip(null);
          setHover(null);
        }}
      >
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label="Billed and collected per month">
            {[0, 0.5, 1].map((g) => (
              <g key={g}>
                <line x1={LEFT} x2={width} y1={y(max * g)} y2={y(max * g)} stroke={g === 0 ? "var(--line-strong)" : "var(--line)"} />
                <text x={LEFT - 8} y={y(max * g) + 4} textAnchor="end" className="fill-muted text-[11px] tabular">
                  {money(max * g, { compact: true })}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = LEFT + slot * i + slot / 2;
              const date = new Date(`${d.month}-01T00:00:00`);
              return (
                <g
                  key={d.month}
                  onMouseMove={(e) => {
                    setHover(i);
                    setTip({
                      x: e.nativeEvent.offsetX,
                      y: e.nativeEvent.offsetY,
                      content: (
                        <>
                          <div className="mb-1 font-medium">{monthLong.format(date)}</div>
                          <Row color="var(--series-1)" label="Billed" value={money(d.billed, { whole: true })} />
                          <Row color="var(--series-2)" label="Collected" value={money(d.collected, { whole: true })} />
                        </>
                      ),
                    });
                  }}
                >
                  <rect x={LEFT + slot * i} y={TOP} width={slot} height={plot} fill={hover === i ? "var(--hover)" : "transparent"} rx={6} />
                  {[
                    { v: d.billed, dx: -barW / 2 - 1, color: "var(--series-1)" },
                    { v: d.collected, dx: barW / 2 + 1, color: "var(--series-2)" },
                  ].map((b, j) => (
                    <motion.rect
                      key={j}
                      x={x + b.dx - barW / 2}
                      width={barW}
                      rx={Math.min(4, barW / 2)}
                      fill={b.color}
                      initial={{ y: y(0), height: 0 }}
                      animate={{ y: y(b.v), height: Math.max(0, y(0) - y(b.v)) }}
                      transition={{ delay: i * 0.03, type: "spring", stiffness: 160, damping: 22 }}
                    />
                  ))}
                  {i % showEvery === 0 && (
                    <text x={x} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">
                      {monthLabel.format(date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        <Tooltip tip={tip} width={width} />
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="size-2 rounded-[2px]" style={{ background: color }} />
        {label}
      </span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}
