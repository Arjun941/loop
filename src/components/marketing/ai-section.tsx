"use client";
/**
 * Loop's MCP server, shown as a short conversation with the billing system. Static: the messages
 * arrive one by one when the panel scrolls into view, with a brief "working" step before each reply.
 */
import { Logo } from "@/components/shell/logo";
import { ArrowUp, Check } from "lucide-react";
import { motion, useInView, type Variants } from "motion/react";
import { useRef, type ReactNode } from "react";
import { EASE } from "./motion";
import { SectionHeading } from "./section-heading";

const msg: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

export function AiSection() {
  const ref = useRef<HTMLDivElement>(null);
  const play = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section id="ai" className="scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[#07070c] px-5 ring-1 ring-white/[0.08] py-16 text-white sm:px-12 sm:py-20 lg:px-16">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 55% at 0% 0%, rgba(10,132,255,0.28), transparent 70%), radial-gradient(45% 55% at 100% 100%, rgba(94,92,230,0.3), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(60% 60% at 70% 50%, black, transparent)",
          }}
        />

        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              tone="dark"
              eyebrow="AI-ready"
              title="Ask your billing system."
              body="Loop comes with an MCP server, so you can connect it to Claude and other LLMs. Ask questions in plain language, and run billing from chat."
            />
            <ul className="mt-8 space-y-3 text-[15px] text-white/75">
              {["Answers come from your live billing data", "Actions go through the same rules as the app", "Works with any MCP-compatible client"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#0a84ff]/20 text-[#4ea1ff]">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div ref={ref} className="min-w-0 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-5">
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate={play ? "shown" : "hidden"}
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.7, delayChildren: 0.2 } } }}
            >
              <motion.div variants={msg}>
                <You>Which subscriptions renew this week, and is anyone overdue?</You>
              </motion.div>
              <motion.div variants={msg}>
                <Working>Looked up renewals and overdue invoices</Working>
              </motion.div>
              <motion.div variants={msg}>
                <Assistant>
                  <p>
                    <b className="font-semibold text-white">14 subscriptions</b> renew by Sunday, worth ₹3,18,400 a month.
                  </p>
                  <p className="mt-2">Two customers are overdue:</p>
                  <ul className="mt-2 divide-y divide-white/[0.07] overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/[0.07]">
                    <Row name="Meridian Health" amount="₹1,41,600" late="6 days" />
                    <Row name="Northwind Labs" amount="₹9,440" late="3 days" />
                  </ul>
                </Assistant>
              </motion.div>
              <motion.div variants={msg}>
                <You>Send them both a reminder.</You>
              </motion.div>
              <motion.div variants={msg}>
                <Working>Sent 2 overdue reminders</Working>
              </motion.div>
              <motion.div variants={msg}>
                <Assistant>Done. Both reminders are on their way, and each one is in the outbox.</Assistant>
              </motion.div>
            </motion.div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.06] py-2 pr-2 pl-4 ring-1 ring-white/[0.08]">
              <span className="flex-1 truncate text-[13.5px] text-white/35">Ask about revenue, invoices or customers…</span>
              <span className="grid size-8 place-items-center rounded-full bg-white text-[#07070c]">
                <ArrowUp className="size-4" strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function You({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[18px] rounded-br-md bg-[#0a84ff] px-4 py-2.5 text-[14px] leading-snug">{children}</div>
    </div>
  );
}

function Working({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pl-1 text-[12px] text-white/45">
      <span className="flex items-center gap-1.5">
        <Logo size={14} />
        Loop
      </span>
      <span className="text-white/25">·</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function Assistant({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[96%] rounded-[18px] rounded-bl-md bg-white/[0.07] px-4 py-3 text-[14px] leading-relaxed text-white/80 ring-1 ring-white/[0.06]">
      {children}
    </div>
  );
}

function Row({ name, amount, late }: { name: string; amount: string; late: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
      <span className="truncate text-white">{name}</span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="tabular text-white/80">{amount}</span>
        <span className="rounded-full bg-[#ff453a]/15 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#ff6961]">
          {late}
          <span className="hidden sm:inline"> late</span>
        </span>
      </span>
    </li>
  );
}
