"use client";
/**
 * The first screen: one sentence, two buttons, and the product doing its job underneath.
 * Entrances play on load (not on scroll) so the page never opens on an empty screen.
 */
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { HeroVisual } from "./hero-visual";
import { EASE } from "./motion";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 20, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.9, delay, ease: EASE },
});

export function Hero() {
  return (
    <section className="relative px-4 pt-16 pb-10 sm:px-6 sm:pt-24 sm:pb-12">
      <div className="mx-auto max-w-4xl text-center">
        <motion.p {...rise(0)} className="text-[13px] font-semibold tracking-wide text-accent">
          Subscription billing, end to end
        </motion.p>
        <motion.h1
          {...rise(0.08)}
          className="mt-4 text-[42px] leading-[1.03] font-semibold tracking-[-0.045em] text-balance sm:text-[64px] lg:text-[76px]"
        >
          Subscription billing
          <br />
          <span className="bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] bg-clip-text text-transparent">that runs itself.</span>
        </motion.h1>
        <motion.p
          {...rise(0.16)}
          className="mx-auto mt-6 max-w-[34rem] text-[17px] leading-relaxed text-pretty text-muted sm:text-[19px]"
        >
          Quotes, subscriptions, invoices, payments and revenue in one calm place. Loop bills on the right day, matches what
          comes in, and shows you what’s at risk.
        </motion.p>
        <motion.div {...rise(0.24)} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/signup" size="lg" className="w-full rounded-full px-6 sm:w-auto">
            Get started
            <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="#how" variant="secondary" size="lg" className="w-full rounded-full px-6 sm:w-auto">
            See how it works
          </ButtonLink>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
        className="mx-auto mt-16 max-w-[1080px] sm:mt-20"
      >
        <HeroVisual />
      </motion.div>
    </section>
  );
}
