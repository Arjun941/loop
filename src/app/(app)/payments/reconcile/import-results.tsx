"use client";
/**
 * The result of matching a statement, grouped by how sure Loop is:
 * matched automatically (apply all at once), needs a look, and no match.
 */
import { InvoicePicker, type PickedInvoice } from "@/components/invoices/invoice-picker";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/status";
import { formatDate, money, number } from "@/lib/format";
import type { getImport } from "@/server/services/reconcile";
import { Check, CircleHelp, Loader2, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyLinesAction, ignoreLineAction } from "./actions";

type Data = NonNullable<Awaited<ReturnType<typeof getImport>>>;
type Line = Data["lines"][number];

export function ImportResults({ data }: { data: Data }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const auto = data.lines.filter((l) => l.status === "auto");
  const review = data.lines.filter((l) => l.status === "review" && l.matchedInvoiceId);
  const unmatched = data.lines.filter((l) => l.status === "review" && !l.matchedInvoiceId);
  const done = data.lines.filter((l) => l.status === "applied" || l.status === "ignored");
  const autoTotal = auto.reduce((s, l) => s + l.amount, 0);

  function apply(choices: { lineId: string; invoiceId?: string }[], label: string) {
    start(async () => {
      const r = await applyLinesAction(data.id, choices);
      if (r.failures.length) toast.error(`${r.failures.length} couldn't be applied: ${r.failures[0]}`);
      if (r.applied) toast.success(`${label}: ${number(r.applied)} payment${r.applied === 1 ? "" : "s"} recorded`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight">{data.fileName}</div>
          <div className="text-sm text-muted">
            {number(data.lines.length)} incoming payments · {number(data.lines.filter((l) => l.status === "applied" || l.status === "auto").length)} matched automatically
          </div>
        </div>
        <Stat label="Auto" value={auto.length} tone="text-success" />
        <Stat label="Review" value={review.length} tone="text-warning" />
        <Stat label="No match" value={unmatched.length} tone="text-muted" />
        <Stat label="Done" value={done.length} tone="text-fg" />
        <ButtonLink href="/payments/reconcile" variant="secondary" className="border border-field-border shadow-none">
          New statement
        </ButtonLink>
      </Card>

      {auto.length > 0 && (
        <Section
          title="Matched automatically"
          description="Invoice number or customer name, with the exact amount."
          action={
            <Button disabled={pending} onClick={() => apply(auto.map((l) => ({ lineId: l.id })), "Applied")}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Apply {number(auto.length)} · {money(autoTotal, { whole: true })}
            </Button>
          }
        >
          {auto.map((l, i) => (
            <LineRow key={l.id} line={l} index={i} />
          ))}
        </Section>
      )}

      {review.length > 0 && (
        <Section title="Needs a look" description="A likely match. Check it, then apply or ignore.">
          {review.map((l, i) => (
            <LineRow key={l.id} line={l} index={i}>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => apply([{ lineId: l.id }], "Applied")}>
                <Check className="size-3.5" /> Apply
              </Button>
              <IgnoreButton lineId={l.id} />
            </LineRow>
          ))}
        </Section>
      )}

      {unmatched.length > 0 && (
        <Section title="No match found" description="Pick the invoice yourself, or ignore it (e.g. a refund or a transfer).">
          {unmatched.map((l, i) => (
            <UnmatchedRow key={l.id} line={l} index={i} onApply={(invoiceId) => apply([{ lineId: l.id, invoiceId }], "Applied")} pending={pending} />
          ))}
        </Section>
      )}

      {done.length > 0 && (
        <Section title="Done" description="Recorded as payments, or set aside.">
          {done.map((l, i) => (
            <LineRow key={l.id} line={l} index={i} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="text-center">
      <div className={`text-[22px] leading-none font-semibold tabular ${tone}`}>{number(value)}</div>
      <div className="mt-1 text-[12px] text-muted">{label}</div>
    </div>
  );
}

function Section({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
        {action}
      </div>
      <ul className="px-2 pb-2">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </ul>
    </Card>
  );
}

function LineRow({ line, index, children }: { line: Line; index: number; children?: React.ReactNode }) {
  const applied = line.status === "applied";
  const ignored = line.status === "ignored";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: ignored ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.02 }}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-3"
    >
      <div className="min-w-0 flex-1 basis-60">
        <div className="truncate text-[14px] font-medium">{line.reference}</div>
        <div className="text-xs text-muted tabular">{formatDate(line.txnDate)}</div>
      </div>
      <div className="min-w-0 basis-56 text-[13px]">
        {line.invoice ? (
          <>
            <span className="font-medium tabular">{line.invoice.number}</span>
            <span className="text-muted"> · {line.invoice.customerName}</span>
          </>
        ) : (
          <span className="text-muted">No invoice</span>
        )}
      </div>
      <div className="w-28 text-right text-[14px] font-medium tabular">{money(line.amount)}</div>
      <div className="flex w-[180px] items-center justify-end gap-1.5">
        {applied ? <Pill tone="success">Recorded</Pill> : ignored ? <Pill>Ignored</Pill> : children ?? <Confidence value={line.confidence} />}
      </div>
    </motion.li>
  );
}

function Confidence({ value }: { value: number }) {
  return <Pill tone={value >= 0.9 ? "success" : "warning"}>{Math.round(value * 100)}% sure</Pill>;
}

function IgnoreButton({ lineId }: { lineId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label="Ignore"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await ignoreLineAction(lineId);
          router.refresh();
        })
      }
    >
      <X className="size-3.5" />
    </Button>
  );
}

function UnmatchedRow({ line, index, onApply, pending }: { line: Line; index: number; onApply: (invoiceId: string) => void; pending: boolean }) {
  const [picked, setPicked] = useState<PickedInvoice | null>(null);
  const [choosing, setChoosing] = useState(false);
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index, 10) * 0.02 }} className="rounded-xl px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CircleHelp className="size-4 text-subtle" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{line.reference}</div>
          <div className="text-xs text-muted tabular">{formatDate(line.txnDate)}</div>
        </div>
        <div className="w-28 text-right text-[14px] font-medium tabular">{money(line.amount)}</div>
        <div className="flex w-[180px] items-center justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setChoosing((c) => !c)}>
            Choose invoice
          </Button>
          <IgnoreButton lineId={line.id} />
        </div>
      </div>
      {choosing && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <InvoicePicker name="invoice" value={picked} onChange={setPicked} />
          </div>
          <Button disabled={!picked || pending} onClick={() => picked && onApply(picked.id)} className="h-11 rounded-xl">
            Apply to {picked?.number ?? "invoice"}
          </Button>
        </div>
      )}
    </motion.li>
  );
}
