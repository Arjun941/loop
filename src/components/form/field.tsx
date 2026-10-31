"use client";
/**
 * Layout helpers around controls: a labelled field with hint and animated error, a form-level
 * error banner, a section heading for long forms, and a submit button that shows progress.
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

export function Field({
  label,
  error,
  hint,
  aside,
  children,
  className,
}: {
  label: string;
  error?: string;
  /** Muted helper text shown under the control when there's no error. */
  hint?: ReactNode;
  /** Content aligned right of the label, e.g. a "Forgot password?" link. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-fg/80">{label}</span>
        {aside}
      </div>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key={"e" + error}
            role="alert"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-1.5 text-[13px] text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-[13px] text-muted">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="mb-1 flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-3 text-[13.5px] text-danger">
            <AlertCircle className="mt-px size-4 shrink-0" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-[12px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function SubmitButton({ pending, children, className }: { pending: boolean; children: ReactNode; className?: string }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className={cn("relative h-11 w-full rounded-xl", className)}>
      <span className={cn("transition-opacity duration-150", pending && "opacity-0")}>{children}</span>
      {pending && <Loader2 className="absolute size-[18px] animate-spin" />}
    </Button>
  );
}
