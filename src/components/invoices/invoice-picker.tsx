"use client";
/**
 * Pick an open invoice by typing its number or the customer's name. Results come from the server.
 */
import { findOpenInvoices } from "@/app/(app)/invoices/actions";
import { controlClass, Input } from "@/components/form/controls";
import { formatDate, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";

export type PickedInvoice = { id: string; number: string; customer: string; dueDate: string; balance: number };

export function InvoicePicker({
  name,
  value,
  onChange,
  invalid,
}: {
  name: string;
  value: PickedInvoice | null;
  onChange: (inv: PickedInvoice) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedInvoice[]>([]);
  const [active, setActive] = useState(0);
  const [searching, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => start(async () => setResults(await findOpenInvoices(query))), 160);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function pick(inv: PickedInvoice) {
    onChange(inv);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value?.id ?? ""} />
      {value && !open ? (
        <button type="button" onClick={() => setOpen(true)} className={cn(controlClass, "flex h-auto items-center gap-3 py-2 text-left", invalid && "border-danger")}>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium tabular">{value.number}</span>
            <span className="block truncate text-[12.5px] text-muted">
              {value.customer} · {money(value.balance)} due
            </span>
          </span>
          <span className="text-[13px] text-accent">Change</span>
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <Input
            role="combobox"
            aria-expanded={open}
            placeholder="Invoice number or customer"
            value={query}
            invalid={invalid}
            autoFocus
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className="pl-10"
          />
          {searching && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-subtle" />}
        </div>
      )}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-lg"
          >
            {results.map((inv, i) => (
              <li key={inv.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(inv)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", i === active && "bg-hover")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium tabular">{inv.number}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {inv.customer} · due {formatDate(inv.dueDate, { short: true })}
                    </span>
                  </span>
                  <span className="text-[13.5px] font-medium tabular">{money(inv.balance)}</span>
                </button>
              </li>
            ))}
            {!searching && results.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">No open invoices match.</li>}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
