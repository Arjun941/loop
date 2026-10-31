"use client";
/**
 * Edits a small list of rows inside a form (product variants, template lines).
 * Rows animate in and out; the whole list is submitted as one JSON field.
 */
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

export function RowsEditor<T extends { key: string }>({
  name,
  rows,
  onChange,
  blank,
  serialize,
  renderRow,
  addLabel,
  empty,
}: {
  name: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: () => T;
  /** Converts the rows to what the server expects (drops UI-only fields like `key`). */
  serialize: (rows: T[]) => unknown;
  renderRow: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  empty?: string;
}) {
  return (
    <div data-field={name}>
      <input type="hidden" name={name} value={JSON.stringify(serialize(rows))} />
      {rows.length === 0 && empty && <p className="mb-2 text-[13px] text-muted">{empty}</p>}
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <motion.li
              key={row.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className="flex items-start gap-2"
            >
              <div className="min-w-0 flex-1">{renderRow(row, (patch) => onChange(rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r))))}</div>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <button
        type="button"
        onClick={() => onChange([...rows, blank()])}
        className="mt-2 flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent-soft"
      >
        <Plus className="size-4" strokeWidth={2.4} /> {addLabel}
      </button>
    </div>
  );
}

let counter = 0;
/** A stable key for a new client-side row. */
export function rowKey() {
  return `row-${Date.now()}-${counter++}`;
}
