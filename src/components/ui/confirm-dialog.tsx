"use client";
/**
 * A small centered dialog for actions that can't be undone, like closing a subscription.
 */
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "danger",
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal aria-label={title}>
          <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className="relative w-full max-w-[380px] rounded-[22px] bg-surface p-6 text-center shadow-lg"
          >
            <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
            <div className="mt-2 text-[14px] leading-relaxed text-muted">{body}</div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={onCancel} className="h-11 rounded-xl">
                Cancel
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={pending}
                className={tone === "danger" ? "h-11 rounded-xl bg-danger text-white hover:brightness-110" : "h-11 rounded-xl"}
                autoFocus
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
