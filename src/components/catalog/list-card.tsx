"use client";
/**
 * Building blocks for catalog tabs: a card with a title and "New" button,
 * clickable rows, and the hook that tracks which item the editor sheet is showing.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

export function ListCard({
  title,
  description,
  count,
  newLabel,
  onNew,
  children,
}: {
  title: string;
  description: string;
  count: number;
  newLabel?: string;
  onNew?: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">
            {title} <span className="ml-1 font-normal text-subtle tabular">{count}</span>
          </h2>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
        {onNew && newLabel && (
          <Button size="sm" onClick={onNew}>
            <Plus className="size-4" strokeWidth={2.4} /> {newLabel}
          </Button>
        )}
      </div>
      <ul className="px-2 pb-2">{children}</ul>
    </Card>
  );
}

export function ListRow({
  onClick,
  muted,
  children,
  index = 0,
}: {
  onClick?: () => void;
  muted?: boolean;
  children: ReactNode;
  index?: number;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.025, type: "spring", stiffness: 500, damping: 40 }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors",
          onClick && "hover:bg-hover",
          muted && "opacity-55",
        )}
      >
        {children}
        {onClick && <ChevronRight className="size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />}
      </button>
    </motion.li>
  );
}

/** Tracks the editor sheet: closed, creating a new item, or editing an existing one. */
export function useEditor<T>() {
  const [state, setState] = useState<{ open: boolean; item: T | null; key: number }>({ open: false, item: null, key: 0 });
  return {
    open: state.open,
    item: state.item,
    /** Changes on every open, so forms remount with fresh state. */
    key: state.key,
    create: () => setState((s) => ({ open: true, item: null, key: s.key + 1 })),
    edit: (item: T) => setState((s) => ({ open: true, item, key: s.key + 1 })),
    close: () => setState((s) => ({ ...s, open: false })),
  };
}
