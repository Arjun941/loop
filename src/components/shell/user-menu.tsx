"use client";
/**
 * Avatar button that opens a small account popover with sign-out.
 */
import { signOut } from "@/app/(auth)/actions";
import { Pill } from "@/components/ui/status";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export type MenuUser = { name: string; email: string; role: "admin" | "staff" | "customer" };

const ROLE_LABEL = { admin: "Admin", staff: "Staff", customer: "Customer" } as const;

export function UserMenu({ user, compact, placement = "up" }: { user: MenuUser; compact?: boolean; placement?: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[10px] text-left transition-colors hover:bg-hover",
          compact ? "p-1" : "px-2 py-1.5",
        )}
      >
        <Avatar name={user.name} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="block truncate text-[11.5px] text-muted">{ROLE_LABEL[user.role]}</span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: placement === "up" ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className={cn(
              "absolute z-40 w-64 rounded-2xl bg-surface p-1.5 shadow-lg",
              placement === "up" ? "bottom-full left-0 mb-2 origin-bottom-left" : "top-full right-0 mt-2 origin-top-right",
            )}
          >
            <div className="flex items-center gap-3 px-2.5 py-2.5">
              <Avatar name={user.name} size={36} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
            </div>
            <div className="px-2.5 pb-2">
              <Pill tone={user.role === "admin" ? "accent" : "neutral"}>{ROLE_LABEL[user.role]}</Pill>
            </div>
            <div className="my-1 h-px bg-line" />
            <form action={signOut}>
              <button className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-fg transition-colors hover:bg-hover">
                <LogOut className="size-4 text-muted" /> Sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
