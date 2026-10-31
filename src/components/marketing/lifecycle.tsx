"use client";
/**
 * Quote → active → billed → paid. The track fills once as the section scrolls in, lighting each
 * stage as it arrives; afterwards a faint pulse keeps travelling along it, the loop in Loop.
 */
import { StatusPill } from "@/components/ui/status";
import { BadgeCheck, ChevronRight, FileSignature, Receipt, Repeat, type LucideIcon } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { EASE } from "./motion";
import { SectionHeading } from "./section-heading";

type Step = { icon: LucideIcon; label: string; title: string; detail: ReactNode };

const STEPS: Step[] = [
  {
    icon: FileSignature,
    label: "Quote",
    title: "Send a quote from a template",
    detail: <MiniRow code="Q-2026-0142" meta="Studio · Yearly" status="quotation" />,
  },
  {
    icon: Repeat,
    label: "Active",
    title: "Accepted, and the subscription goes live",
    detail: <MiniRow code="SUB-0918" meta="Renews 1 Nov 2027" status="active" />,
  },
  {
    icon: Receipt,
    label: "Billed",
    title: "Invoiced on billing day, tax applied",
    detail: <MiniRow code="INV-2026-0412" meta="₹2,83,200 incl. GST" status="confirmed" label="Sent" />,
  },
  {
    icon: BadgeCheck,
    label: "Paid",
    title: "Matched from the bank statement",
    detail: <MiniRow code="UPI · 2 Nov" meta="Matched automatically" status="paid" />,
  },
];

const FILL = 2.1; // seconds for the track to fill
const START = 0.25;
const litAt = (i: number) => START + (FILL * i) / (STEPS.length - 1);

export function Lifecycle() {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, amount: 0.45 });
  const reduce = useReducedMotion();

  return (
    <section id="how" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
      <SectionHeading
        eyebrow="How it works"
        title="One flow, from quote to paid."
        body="Every subscription follows the same clear path. Loop takes care of each handoff, so nothing waits on someone remembering."
      />

      <div ref={ref} className="relative mx-auto mt-14 max-w-5xl rounded-[28px] bg-surface p-6 shadow-sm sm:p-10">
        {/* Track from the first node to the last (md and up; phones get a segment per step). */}
        <Track play={play} reduce={!!reduce} className="top-[calc(2.5rem+19px)] right-[calc(25%+1.25rem-38px)] left-[calc(2.5rem+20px)] hidden h-[2px] lg:block" />

        <ol className="relative grid grid-cols-1 gap-9 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.label} className="relative flex gap-4 lg:block">
              {i < STEPS.length - 1 && (
                <span aria-hidden className="absolute top-12 -bottom-7 left-[19px] w-[2px] overflow-hidden rounded-full bg-line lg:hidden">
                  <motion.span
                    className="absolute inset-0 origin-top bg-gradient-to-b from-[#0a84ff] to-[#5e5ce6]"
                    initial={{ scaleY: 0 }}
                    animate={play ? { scaleY: 1 } : undefined}
                    transition={{ delay: litAt(i), duration: litAt(i + 1) - litAt(i), ease: "linear" }}
                  />
                </span>
              )}
              <Node icon={s.icon} lit={play} delay={litAt(i)} />
              <motion.div
                className="min-w-0 flex-1 lg:mt-6"
                initial={{ opacity: 0, y: 10 }}
                animate={play ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: litAt(i) + 0.1, duration: 0.6, ease: EASE }}
              >
                <div className="text-[12px] font-semibold tracking-wide text-accent uppercase">{s.label}</div>
                <div className="mt-1.5 text-[15.5px] leading-snug font-medium tracking-[-0.01em] lg:min-h-[2.75em]">{s.title}</div>
                <div className="mt-4 max-w-sm lg:max-w-none">{s.detail}</div>
              </motion.div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {["draft", "quotation", "confirmed", "active", "closed"].map((st, i) => (
              <span key={st} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="size-3.5 text-subtle" />}
                <StatusPill status={st} />
              </span>
            ))}
          </div>
          <p className="text-[13px] text-muted lg:max-w-[19rem] lg:text-right">
            The same rules decide what you can do on screen and what the server allows.
          </p>
        </div>
      </div>
    </section>
  );
}

function Track({ play, reduce, className }: { play: boolean; reduce: boolean; className: string }) {
  return (
    <div aria-hidden className={`absolute overflow-hidden rounded-full bg-line ${className}`}>
      <motion.div
        className="absolute inset-0 origin-left bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]"
        initial={{ scaleX: 0 }}
        animate={play ? { scaleX: 1 } : undefined}
        transition={{ delay: START, duration: FILL, ease: "linear" }}
      />
      {play && !reduce && (
        <motion.div
          className="absolute top-0 h-full w-16 -translate-x-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: ["0%", "100%", "100%"], opacity: [0, 1, 0] }}
          transition={{ delay: START + FILL + 0.6, duration: 4.5, times: [0, 0.85, 1], repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

function Node({ icon: Icon, lit, delay }: { icon: LucideIcon; lit: boolean; delay: number }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-surface text-subtle ring-1 ring-line-strong">
      <Icon className="size-[18px]" strokeWidth={1.9} />
      <motion.span
        className="absolute inset-0 grid place-items-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white shadow-[0_6px_18px_-4px_rgba(10,132,255,0.6)]"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={lit ? { opacity: 1, scale: 1 } : undefined}
        transition={{ delay, duration: 0.5, ease: EASE }}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </motion.span>
    </span>
  );
}

function MiniRow({ code, meta, status, label }: { code: string; meta: string; status: string; label?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5 ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[12px] text-fg">{code}</span>
        {label ? (
          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-accent-soft px-2.5 text-xs font-medium text-accent">
            <span className="size-1.5 rounded-full bg-current opacity-80" />
            {label}
          </span>
        ) : (
          <StatusPill status={status} />
        )}
      </div>
      <div className="mt-1.5 truncate text-[12.5px] text-muted">{meta}</div>
    </div>
  );
}
