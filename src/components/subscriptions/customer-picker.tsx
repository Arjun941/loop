"use client";
/**
 * Pick a customer by typing a name or email. Results come from the server (there are thousands),
 * the keyboard works throughout, and a new customer can be created without leaving the form.
 */
import { createCustomer, findCustomers } from "@/app/(app)/subscriptions/actions";
import { controlClass, Input } from "@/components/form/controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

export type PickedCustomer = { id: string; name: string; email: string };

export function CustomerPicker({
  name,
  value,
  onChange,
  invalid,
}: {
  name: string;
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedCustomer[]>([]);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [searching, startSearch] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced server search while the popover is open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => startSearch(async () => setResults(await findCustomers(query))), 160);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function pick(c: PickedCustomer) {
    onChange(c);
    setOpen(false);
    setCreating(false);
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(controlClass, "flex h-auto items-center gap-3 py-2 text-left", invalid && "border-danger")}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
            {value.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{value.name}</span>
            <span className="block truncate text-[12.5px] text-muted">{value.email}</span>
          </span>
          <span className="text-[13px] text-accent">Change</span>
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <Input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            placeholder="Search customers by name or email"
            value={query}
            invalid={invalid}
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
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-full z-30 mt-1.5 origin-top overflow-hidden rounded-2xl bg-surface p-1.5 shadow-lg"
          >
            {creating ? (
              <NewCustomer initialName={query} onCreated={pick} onCancel={() => setCreating(false)} />
            ) : (
              <>
                <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
                  {results.map((c, i) => (
                    <li key={c.id} role="option" aria-selected={i === active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(c)}
                        className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left", i === active && "bg-hover")}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{c.name}</span>
                          <span className="block truncate text-[12.5px] text-muted">{c.email}</span>
                        </span>
                        {value?.id === c.id && <Check className="size-4 text-accent" />}
                      </button>
                    </li>
                  ))}
                  {!searching && results.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">No customers match “{query}”.</li>}
                </ul>
                <div className="mt-1 border-t border-line pt-1">
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-medium text-accent hover:bg-accent-soft"
                  >
                    <Plus className="size-4" strokeWidth={2.4} /> New customer{query && ` “${query}”`}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewCustomer({ initialName, onCreated, onCancel }: { initialName: string; onCreated: (c: PickedCustomer) => void; onCancel: () => void }) {
  const [values, setValues] = useState({ name: initialName, email: "" });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const result = await createCustomer(values);
      if (result.customer) onCreated(result.customer);
      else setErrors(result.fieldErrors ?? { name: result.error });
    });
  }

  return (
    <div className="flex flex-col gap-2.5 p-2.5" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), save())}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">New customer</span>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="grid size-6 place-items-center rounded-full text-muted hover:bg-hover">
          <X className="size-3.5" />
        </button>
      </div>
      <Input autoFocus placeholder="Company or person" value={values.name} invalid={!!errors.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      {errors.name && <p className="text-[12.5px] text-danger">{errors.name}</p>}
      <Input type="email" placeholder="billing@company.com" value={values.email} invalid={!!errors.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
      {errors.email && <p className="text-[12.5px] text-danger">{errors.email}</p>}
      <Button type="button" onClick={save} disabled={pending} className="h-10 rounded-xl">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Create and select"}
      </Button>
    </div>
  );
}
