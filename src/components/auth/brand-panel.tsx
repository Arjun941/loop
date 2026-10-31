"use client";
/**
 * The left half of the sign-in screens on desktop: what Loop does, shown with a few
 * floating glimpses of the product rather than described in bullet points.
 */
import { Logo } from "@/components/shell/logo";
import { ArrowUpRight, Check, Link2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#07070c] text-white lg:flex lg:flex-col">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 20% 15%, rgba(10,132,255,0.35), transparent 70%), radial-gradient(45% 40% at 85% 75%, rgba(94,92,230,0.32), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(70% 60% at 50% 45%, black, transparent)",
        }}
      />

      <div className="relative flex items-center gap-2.5 p-10">
        <Logo size={30} />
        <span className="text-[17px] font-semibold tracking-tight">Loop</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-10">
        <div className="relative h-[400px] w-full max-w-[440px]">
          <Floating delay={0.1} className="top-0 left-0 w-[300px]">
            <Glimpse icon={<Check className="size-4" strokeWidth={2.8} />} tint="#30d158" title="Billing run complete" body="212 invoices created · ₹18,42,600" />
          </Floating>
          <Floating delay={0.25} className="top-[112px] right-0 w-[290px]">
            <Glimpse icon={<Link2 className="size-4" strokeWidth={2.4} />} tint="#0a84ff" title="Payment matched" body="INV-2026-036062 · ₹7,070.56 via UPI" />
          </Floating>
          <Floating delay={0.4} className="bottom-0 left-6 w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <div className="text-[12px] text-white/55">Monthly recurring revenue</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] font-semibold tracking-tight">₹3.94 Cr</span>
                <span className="flex items-center text-[12px] font-medium text-[#30d158]">
                  <ArrowUpRight className="size-3.5" /> 4.2%
                </span>
              </div>
              <Sparkline />
            </div>
          </Floating>
        </div>
      </div>

      <div className="relative p-10">
        <h2 className="max-w-[380px] text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">Recurring revenue, running itself.</h2>
        <p className="mt-3 max-w-[380px] text-[15px] leading-relaxed text-white/60">
          Subscriptions, invoices and payments, in one calm place.
        </p>
      </div>
    </aside>
  );
}

function Floating({ children, className, delay }: { children: ReactNode; className: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: reduce ? 0 : [0, -6, 0], scale: 1 }}
      transition={{
        opacity: { delay, duration: 0.6 },
        scale: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        y: reduce ? { delay, duration: 0.6 } : { delay: delay + 0.6, duration: 6, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      {children}
    </motion.div>
  );
}

function Glimpse({ icon, tint, title, body }: { icon: ReactNode; tint: string; title: string; body: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-xl">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: tint + "26", color: tint }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-medium">{title}</div>
        <div className="truncate text-[12.5px] text-white/55">{body}</div>
      </div>
    </div>
  );
}

function Sparkline() {
  return (
    <svg viewBox="0 0 280 48" className="mt-3 h-12 w-full" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a84ff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#0a84ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 40 L35 36 L70 38 L105 30 L140 31 L175 22 L210 20 L245 12 L280 8 L280 48 L0 48 Z" fill="url(#spark-fill)" />
      <motion.path
        d="M0 40 L35 36 L70 38 L105 30 L140 31 L175 22 L210 20 L245 12 L280 8"
        fill="none"
        stroke="#0a84ff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.7, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
