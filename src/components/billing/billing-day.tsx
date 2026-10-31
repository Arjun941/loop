"use client";
/**
 * Billing Day: preview every invoice a run would create, then create (and email) them in one go.
 *
 * The preview and the run share the same engine on the server, so what's listed here is exactly
 * what gets created. Running twice is safe: the second run finds nothing new to bill.
 */
import { runBillingAction, sendRemindersAction } from "@/app/(app)/billing/actions";
import { Input, Switch } from "@/components/form/controls";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/status";
import { formatDate, money, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BillingPreview } from "@/server/queries/billing";
import type { Flag } from "@/server/services/billing";
import { BellRing, CalendarCheck2, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const FLAG: Record<Flag, { label: string; tone: "accent" | "warning" | "neutral" | "success" }> = {
  catch_up: { label: "Catch-up", tone: "warning" },
  final_invoice: { label: "Final invoice", tone: "neutral" },
  auto_close: { label: "Last invoice, then closes", tone: "neutral" },
  discount_ending: { label: "Discount ends soon", tone: "accent" },
  discount_stopped: { label: "Discount no longer applies", tone: "warning" },
};

type Result = Extract<Awaited<ReturnType<typeof runBillingAction>>, { ok: true }>["result"];

export function BillingDay({ preview }: { preview: BillingPreview }) {
  const router = useRouter();
  const [send, setSend] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [running, startRun] = useTransition();
  const [changingDate, startDate] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const future = preview.asOf > preview.today;
  const t = preview.totals;

  function changeDate(date: string) {
    setResult(null);
    startDate(() => router.replace(date && date !== preview.today ? `/billing?date=${date}` : "/billing", { scroll: false }));
  }

  function run() {
    setResult(null);
    startRun(async () => {
      const response = await runBillingAction(preview.asOf, send);
      if (!response.ok) return void toast.error(response.error);
      setResult(response.result);
      router.refresh();
    });
  }

  const flagCounts = (Object.keys(FLAG) as Flag[])
    .map((f) => ({ flag: f, count: preview.rows.filter((r) => r.flags.includes(f)).length }))
    .filter((f) => f.count > 0);
  const rows = showAll ? preview.rows : preview.rows.slice(0, 12);

  return (
    <div className={cn("flex flex-col gap-5 transition-opacity", changingDate && "opacity-60")}>
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <label className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-muted">Bill everything due by</span>
          <Input type="date" value={preview.asOf} onChange={(e) => changeDate(e.target.value)} className="h-10 w-[170px]" />
        </label>
        {future && <Pill tone="accent">Looking ahead · preview only</Pill>}
        <div className="ml-auto min-w-[260px]">
          <Switch name="send" checked={send} onChange={setSend} label="Confirm and email invoices" description={send ? "Customers get their invoice right away." : "Invoices are created as drafts for review."} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Invoices to create" value={<AnimatedNumber value={t.count} />} />
        <Tile label="Total to bill" value={<AnimatedNumber value={t.amount} format="money" />} />
        <Tile label="Customers" value={<AnimatedNumber value={t.customers} />} hint={t.discounts ? `${number(t.discounts)} with a discount` : undefined} />
        <Tile
          label="Already billed"
          value={<AnimatedNumber value={preview.skipped} />}
          hint={preview.skipped ? "Skipped: never billed twice" : "No duplicates"}
          icon={<ShieldCheck className="size-4 text-success" />}
        />
      </div>

      <AnimatePresence mode="wait">
        {running ? (
          <RunningCard key="running" count={t.count} send={send} />
        ) : result ? (
          <ResultCard key="result" result={result} onDismiss={() => setResult(null)} />
        ) : (
          <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold tracking-tight">
                  {t.count === 0 ? "Nothing to bill" : `Ready to create ${number(t.count)} invoice${t.count === 1 ? "" : "s"} for ${money(t.amount, { whole: true })}`}
                </div>
                <div className="text-sm text-muted">
                  {t.count === 0
                    ? `Every active subscription is billed up to ${formatDate(preview.asOf)}.`
                    : future
                      ? "This is a look ahead. Billing can only run for today or earlier."
                      : `Taxes and discounts are applied automatically.${t.closing ? ` ${number(t.closing)} subscription${t.closing === 1 ? " reaches its" : "s reach their"} end date and close.` : ""}`}
                </div>
              </div>
              <Button size="lg" onClick={run} disabled={t.count === 0 || future} className="h-11 w-full rounded-xl sm:w-auto">
                Run billing
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {flagCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {flagCounts.map(({ flag, count }) => (
            <Pill key={flag} tone={FLAG[flag].tone}>
              {FLAG[flag].label} · {count}
            </Pill>
          ))}
        </div>
      )}

      {preview.rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-[15px] font-semibold tracking-tight">Invoices this run will create</h2>
            <span className="text-[13px] text-muted tabular">{number(preview.rows.length)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-[12px] text-muted">
                  <th className="px-5 py-2 text-left font-medium">Subscription</th>
                  <th className="px-3 py-2 text-left font-medium">Customer</th>
                  <th className="hidden px-3 py-2 text-left font-medium md:table-cell">Period</th>
                  <th className="hidden px-3 py-2 text-left font-medium lg:table-cell">Notes</th>
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-line">
                    <td className="px-5 py-3">
                      <Link href={`/subscriptions/${r.subscriptionId}`} className="font-medium tabular hover:text-accent">
                        {r.subscriptionNumber}
                      </Link>
                      <div className="text-xs text-muted">{r.planName}</div>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3">{r.customerName}</td>
                    <td className="hidden px-3 py-3 text-muted tabular md:table-cell">
                      {formatDate(r.periodStart, { short: true })} – {formatDate(r.periodEnd, { short: true })}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.discount > 0 && <Pill tone="success">−{money(r.discount, { whole: true })}</Pill>}
                        {r.flags.map((f) => (
                          <Pill key={f} tone={FLAG[f].tone}>
                            {FLAG[f].label}
                          </Pill>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular">{money(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > rows.length && (
            <button onClick={() => setShowAll(true)} className="w-full border-t border-line py-3 text-[13.5px] font-medium text-accent hover:bg-hover">
              Show all {number(preview.rows.length)}
            </button>
          )}
        </Card>
      )}

      <RemindersCard overdue={preview.reminders.overdue} renewals={preview.reminders.renewals} />
    </div>
  );
}

function Tile({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between text-[13px] text-muted">
        {label}
        {icon}
      </div>
      <div className="mt-1.5 text-[19px] leading-none font-semibold tracking-[-0.025em] sm:text-[24px]">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

function RunningCard({ count, send }: { count: number; send: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-accent" />
          <div className="text-[15px] font-semibold tracking-tight">
            Creating {number(count)} invoices{send ? " and emailing customers" : ""}…
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-soft">
          <motion.div
            className="h-full w-1/3 rounded-full bg-accent"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </Card>
    </motion.div>
  );
}

function ResultCard({ result, onDismiss }: { result: Result; onDismiss: () => void }) {
  const nothing = result.created === 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <motion.div
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 14 }}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success"
        >
          {nothing ? <CalendarCheck2 className="size-5" /> : <Check className="size-5" strokeWidth={3} />}
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight">
            {nothing ? "Nothing new to bill" : `Created ${number(result.created)} invoice${result.created === 1 ? "" : "s"} for ${money(result.amount, { whole: true })}`}
          </div>
          <div className="text-sm text-muted">
            {[
              result.emailed && `${number(result.emailed)} emailed`,
              `${number(result.skipped)} skipped as already billed`,
              result.closed && `${number(result.closed)} subscription${result.closed === 1 ? "" : "s"} closed at expiry`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices" className="text-[14px] font-medium text-accent hover:underline">
            View invoices
          </Link>
          <button onClick={onDismiss} className="text-[14px] text-muted hover:text-fg">
            Dismiss
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

function RemindersCard({ overdue, renewals }: { overdue: number; renewals: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const total = overdue + renewals;

  function sendNow() {
    start(async () => {
      const r = await sendRemindersAction();
      toast.success(r.sent ? `Sent ${number(r.sent)} reminder${r.sent === 1 ? "" : "s"}` : "No reminders were due");
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning-soft text-warning">
        <BellRing className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold tracking-tight">{total ? `${number(total)} reminder${total === 1 ? "" : "s"} due today` : "No reminders due today"}</div>
        <div className="text-sm text-muted">
          {total
            ? `${number(overdue)} overdue invoice${overdue === 1 ? "" : "s"} (at 1, 7 and 14 days) · ${number(renewals)} renewal${renewals === 1 ? "" : "s"} in the next 14 days. They also go out automatically every night.`
            : "Overdue and renewal reminders go out automatically every night."}
        </div>
      </div>
      <Button variant="secondary" onClick={sendNow} disabled={pending || total === 0} className="h-11 w-full rounded-xl border border-field-border shadow-none sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Send now"}
      </Button>
    </Card>
  );
}
