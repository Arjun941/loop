"use client";
/**
 * The hero's product shot, built from HTML and SVG: a dark dashboard where MRR counts up, the
 * revenue line draws itself, and a billing run ticks through its invoices one by one, skipping
 * the one that's already billed. A deliberately dark brand surface in both themes, like the
 * sign-in panel. Every figure is illustrative.
 */
import { Logo } from "@/components/shell/logo";
import { ArrowUpRight, BellRing, Check, Link2 } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useId, useRef, type ReactNode } from "react";
import { smoothPath, toPoints } from "./chart";
import { CountUp, EASE } from "./motion";

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const MRR = [3.52, 3.57, 3.62, 3.69, 3.78, 3.94];
const W = 600;
const H = 190;
const POINTS = toPoints(MRR, { width: W, height: H, min: 3.4, max: 4.0, padX: 10, padY: 18 });
const LINE = smoothPath(POINTS);
const AREA = `${LINE} L${POINTS.at(-1)![0]} ${H} L${POINTS[0][0]} ${H} Z`;
const LAST = POINTS.at(-1)!;

const RUN = [
  { name: "Iyer Design Studio", plan: "Studio · Yearly", amount: "₹2,83,200" },
  { name: "Northwind Labs", plan: "Team · Monthly", amount: "₹9,440" },
  { name: "Kavya Foods", plan: "Growth · Monthly", amount: "₹18,880" },
  { name: "Meridian Health", plan: "Enterprise · Quarterly", amount: "₹1,41,600" },
  { name: "Blue Fern Co.", plan: "Team · Monthly", amount: "₹9,440", skipped: true },
];
const RUN_START = 0.9;
const RUN_STEP = 0.42;
const RUN_END = RUN_START + RUN.length * RUN_STEP;

export function HeroVisual() {
  return (
    <div className="relative">
      {/* Soft colour behind the stage, so it sits in light rather than on the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-10 -bottom-6 -z-10 opacity-60 blur-3xl sm:-inset-x-16"
        style={{
          background:
            "radial-gradient(40% 50% at 25% 40%, rgba(10,132,255,0.45), transparent 70%), radial-gradient(40% 50% at 78% 60%, rgba(94,92,230,0.42), transparent 70%)",
        }}
      />

      <div className="relative overflow-hidden rounded-[22px] bg-[#0a0a10] text-white shadow-[0_40px_100px_-30px_rgba(16,24,80,0.55)] ring-1 ring-white/10 sm:rounded-[28px]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 60% at 10% 0%, rgba(10,132,255,0.22), transparent 70%), radial-gradient(40% 50% at 100% 100%, rgba(94,92,230,0.2), transparent 70%)",
          }}
        />

        {/* Window bar */}
        <div className="relative flex h-12 items-center gap-2.5 border-b border-white/[0.07] px-5">
          <Logo size={20} />
          <span className="text-[13px] font-medium text-white/80">Dashboard</span>
          <span className="ml-auto rounded-full bg-white/[0.07] px-2.5 py-1 text-[11.5px] text-white/60">October</span>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <RevenuePanel />
          <BillingRun />
        </div>
      </div>

      {/* Floating glimpses, overlapping the edges on wider screens. */}
      <Glimpse
        className="-bottom-7 -left-6 hidden w-[280px] lg:block lg:-left-10"
        delay={RUN_END + 0.3}
        icon={<Link2 className="size-4" strokeWidth={2.4} />}
        tint="#0a84ff"
        title="Payment matched"
        body="INV-2026-0412 · ₹28,320 via UPI"
      />
      <Glimpse
        className="-top-6 -right-4 hidden w-[256px] lg:block lg:-right-10"
        delay={RUN_END + 0.6}
        icon={<BellRing className="size-4" strokeWidth={2.2} />}
        tint="#ff9f0a"
        title="Renewal reminder sent"
        body="Kavya Foods · renews in 7 days"
      />
    </div>
  );
}

function RevenuePanel() {
  const fill = useId();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} className="p-5 sm:p-8">
      <div className="text-[12.5px] text-white/55">Monthly recurring revenue</div>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <span className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">
          <CountUp to={3.94} decimals={2} prefix="₹" suffix=" Cr" duration={1.6} delay={0.5} play={play} />
        </span>
        <span className="flex items-center gap-0.5 rounded-full bg-[#30d158]/15 px-2 py-0.5 text-[12px] font-medium text-[#30d158]">
          <ArrowUpRight className="size-3.5" /> 4.2%
        </span>
      </div>

      <div className="relative mt-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a84ff" stopOpacity="0.32" />
              <stop offset="1" stopColor="#0a84ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="white" strokeOpacity="0.06" strokeDasharray="3 5" />
          ))}
          <motion.path
            d={AREA}
            fill={`url(#${fill})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: play ? 1 : 0 }}
            transition={{ delay: 1.2, duration: 1 }}
          />
          <motion.path
            d={LINE}
            fill="none"
            stroke="#0a84ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: play || reduce ? 1 : 0 }}
            transition={{ delay: 0.5, duration: 1.6, ease: EASE }}
          />
          {play && !reduce && (
            <motion.circle
              cx={LAST[0]}
              cy={LAST[1]}
              fill="#0a84ff"
              initial={{ r: 4, opacity: 0 }}
              animate={{ r: [4, 14], opacity: [0.45, 0] }}
              transition={{ delay: 2.3, duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeOut" }}
            />
          )}
          <motion.circle
            cx={LAST[0]}
            cy={LAST[1]}
            r="4.5"
            fill="#0a84ff"
            stroke="#0a0a10"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: play ? 1 : 0 }}
            transition={{ delay: 2, duration: 0.4 }}
          />
        </svg>
        <div className="mt-3 flex justify-between px-[1.5%] text-[11px] text-white/35">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.07] border-t border-white/[0.07] pt-5">
        <Stat label="Subscriptions">
          <CountUp to={7912} duration={1.6} delay={0.6} play={play} />
        </Stat>
        <Stat label="Collected" className="pl-4 sm:pl-6">
          <CountUp to={1.12} decimals={2} prefix="₹" suffix=" Cr" duration={1.6} delay={0.7} play={play} />
        </Stat>
        <Stat label="At risk" className="pl-4 sm:pl-6" tone="#ffb340">
          <CountUp to={6.8} decimals={1} prefix="₹" suffix=" L" duration={1.6} delay={0.8} play={play} />
        </Stat>
      </div>
    </div>
  );
}

function Stat({ label, children, className, tone }: { label: string; children: ReactNode; className?: string; tone?: string }) {
  return (
    <div className={className}>
      <div className="text-[11.5px] text-white/45">{label}</div>
      <div className="mt-1 text-[15px] font-semibold tracking-tight sm:text-[17px]" style={tone ? { color: tone } : undefined}>
        {children}
      </div>
    </div>
  );
}

function BillingRun() {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} className="border-t border-white/[0.07] p-5 sm:p-8 lg:border-t-0 lg:border-l">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-medium">Billing day</div>
          <div className="text-[12px] text-white/45">Saturday, 1 November</div>
        </div>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={play ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: RUN_END, duration: 0.5, ease: EASE }}
          className="flex items-center gap-1 rounded-full bg-[#30d158]/15 px-2.5 py-1 text-[11.5px] font-medium text-[#30d158]"
        >
          <Check className="size-3" strokeWidth={3} /> Run complete
        </motion.span>
      </div>

      <ul className="mt-5 space-y-1">
        {RUN.map((row, i) => {
          const at = RUN_START + i * RUN_STEP;
          return (
            <li key={row.name} className="relative flex items-center gap-3 rounded-xl px-2.5 py-2.5">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-xl bg-white/[0.06]"
                initial={{ opacity: 0 }}
                animate={play ? { opacity: [0, 1, 0] } : undefined}
                transition={{ delay: at - 0.15, duration: 0.7, times: [0, 0.35, 1] }}
              />
              <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[11px] font-semibold text-white/70">
                {row.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{row.name}</span>
                <span className="block truncate text-[11.5px] text-white/45">{row.plan}</span>
              </span>
              <span className="relative hidden text-[13px] text-white/80 tabular sm:block">{row.amount}</span>
              <span className="relative h-5 w-[88px] shrink-0 text-right text-[11.5px] font-medium">
                <motion.span
                  className="absolute inset-0 flex items-center justify-end text-white/35"
                  initial={{ opacity: 1 }}
                  animate={play ? { opacity: 0 } : undefined}
                  transition={{ delay: at, duration: 0.25 }}
                >
                  Queued
                </motion.span>
                <motion.span
                  className={`absolute inset-0 flex items-center justify-end gap-1 ${row.skipped ? "text-white/50" : "text-[#30d158]"}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={play ? { opacity: 1, y: 0 } : undefined}
                  transition={{ delay: at + 0.1, duration: 0.35, ease: EASE }}
                >
                  {row.skipped ? (
                    "Already billed"
                  ) : (
                    <>
                      <Check className="size-3.5" strokeWidth={2.8} /> Created
                    </>
                  )}
                </motion.span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-end justify-between border-t border-white/[0.07] pt-5">
        <div>
          <div className="text-[11.5px] text-white/45">Invoices created</div>
          <div className="mt-1 text-[17px] font-semibold tracking-tight">
            <CountUp to={212} duration={RUN_END - RUN_START} delay={RUN_START} play={play} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11.5px] text-white/45">Billed, incl. GST</div>
          <div className="mt-1 text-[17px] font-semibold tracking-tight">
            <CountUp to={1842600} prefix="₹" duration={RUN_END - RUN_START} delay={RUN_START} play={play} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Glimpse({
  className,
  delay,
  icon,
  tint,
  title,
  body,
}: {
  className: string;
  delay: number;
  icon: ReactNode;
  tint: string;
  title: string;
  body: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`absolute z-10 ${className}`}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: reduce ? 0 : [0, -5, 0], scale: 1 }}
      transition={{
        opacity: { delay, duration: 0.6 },
        scale: { delay, duration: 0.6, ease: EASE },
        y: reduce ? { delay, duration: 0.6 } : { delay: delay + 0.6, duration: 7, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#16161e]/85 p-3.5 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: tint + "26", color: tint }}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium">{title}</div>
          <div className="truncate text-[12px] text-white/55">{body}</div>
        </div>
      </div>
    </motion.div>
  );
}
