"use client";
/**
 * Form controls with one shared look: 44px tall, soft border, accent focus ring, red when invalid.
 * Every control works inside a plain <form> (it submits a named value), so server actions get FormData.
 */
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

export const controlClass = cn(
  "h-11 w-full rounded-xl border border-field-border bg-field px-3.5 text-[15px] text-fg",
  "placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-150",
  "hover:border-line-strong focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_var(--danger-soft)]",
  "disabled:opacity-50",
);

export function Input({ invalid, className, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ invalid, className, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(controlClass, "h-auto min-h-[88px] resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function PasswordInput({ invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} invalid={invalid} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-fg"
      >
        {visible ? <EyeOff className="size-[17px]" /> : <Eye className="size-[17px]" />}
      </button>
    </div>
  );
}

/** Text input with a fixed prefix or suffix, e.g. "₹" or "%". */
export function AffixInput({
  prefix,
  suffix,
  invalid,
  className,
  ...props
}: ComponentProps<"input"> & { prefix?: string; suffix?: string; invalid?: boolean }) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted">{prefix}</span>}
      <Input invalid={invalid} className={cn("tabular", prefix && "pl-8", suffix && "pr-10", className)} {...props} />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[15px] text-muted">{suffix}</span>}
    </div>
  );
}

export function Select({ invalid, className, children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select aria-invalid={invalid || undefined} className={cn(controlClass, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** iOS-style switch that submits "on" when checked. */
export function Switch({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-[14px] font-medium">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        className={cn(
          "relative h-[28px] w-[46px] shrink-0 rounded-full transition-colors duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-accent-soft",
          checked ? "bg-success" : "bg-line-strong",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 700, damping: 38 }}
          className={cn("absolute top-[2px] size-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.2)]", checked ? "right-[2px]" : "left-[2px]")}
        />
      </span>
    </label>
  );
}

/** A single choice from a few options, shown as a segmented control. Submits the chosen value. */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  const layoutId = useId();
  return (
    <div role="radiogroup" className="flex h-11 rounded-xl bg-neutral-soft p-1">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn("relative flex-1 rounded-[9px] text-[13px] font-medium transition-colors", active ? "text-fg" : "text-muted hover:text-fg")}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[9px] bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pick any number of items, shown as toggleable chips. Submits a JSON array. */
export function ChipPicker({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
              on ? "border-accent bg-accent-soft text-accent" : "border-field-border text-muted hover:text-fg",
            )}
          >
            {on && <Check className="size-3.5" strokeWidth={2.6} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
