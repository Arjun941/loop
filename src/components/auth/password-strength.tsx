"use client";
/**
 * Password guidance: a four-step meter plus one plain sentence telling the user the next thing to do.
 * It reflects the exact rules the server enforces (PASSWORD_RULES).
 */
import { PASSWORD_HINT, PASSWORD_RULES } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const TONE = ["bg-danger", "bg-danger", "bg-warning", "bg-warning", "bg-success"];

export function passwordMeetsRules(value: string) {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

export function PasswordStrength({ value }: { value: string }) {
  const met = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const next = PASSWORD_RULES.find((r) => !r.test(value));
  const message = !value ? PASSWORD_HINT : next ? next.need : "Strong password";

  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {PASSWORD_RULES.map((rule, i) => (
          <div key={rule.id} className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-soft">
            <motion.div
              className={cn("h-full rounded-full", TONE[met])}
              initial={false}
              animate={{ width: value && i < met ? "100%" : "0%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.14 }}
          className={cn("mt-2 flex items-center gap-1.5 text-[13px]", !next && value ? "text-success" : "text-muted")}
        >
          {!next && value && <Check className="size-3.5" strokeWidth={2.8} />}
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
