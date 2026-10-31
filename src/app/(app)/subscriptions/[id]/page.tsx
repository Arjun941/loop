import { Card, CardHeader } from "@/components/ui/card";
import { Page, Reveal } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { StatusStepper } from "@/components/subscriptions/status-stepper";
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";
import { Timeline } from "@/components/subscriptions/timeline";
import { PER_PERIOD } from "@/lib/catalog-labels";
import { today } from "@/lib/dates";
import { isEditable } from "@/lib/domain/subscription-status";
import { formatDate, money } from "@/lib/format";
import { getSubscription } from "@/server/queries/subscriptions";
import { AlertTriangle, BadgePercent } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "../back-link";

export const metadata: Metadata = { title: "Subscription" };

export default function SubscriptionPage({ params }: PageProps<"/subscriptions/[id]">) {
  return (
    <Page>
      <BackLink />
      <Reveal fallback={<DetailSkeleton />}>
        <Detail params={params} />
      </Reveal>
    </Page>
  );
}

async function Detail({ params }: { params: PageProps<"/subscriptions/[id]">["params"] }) {
  const { id } = await params;
  const s = await getSubscription(id);
  if (!s) notFound();
  const { sub, plan, customer, pricing } = s;
  const per = PER_PERIOD[plan.period];
  const quoteExpired = sub.status === "quotation" && sub.quoteValidUntil !== null && sub.quoteValidUntil < today();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.022em] tabular">{sub.number}</h1>
            <StatusPill status={sub.status} />
          </div>
          <p className="mt-1 text-[15px] text-muted">
            {customer.name} · {plan.name} · <span className="text-fg tabular">{money(pricing.total)}</span> per {per}
          </p>
        </div>
        <SubscriptionActions id={sub.id} number={sub.number} actions={s.actions} editable={isEditable(sub.status)} />
      </header>

      {quoteExpired && (
        <div className="flex items-center gap-2.5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-[13.5px] text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          This quote expired on {formatDate(sub.quoteValidUntil)}. Edit it to set a new date and resend.
        </div>
      )}

      <Card className="px-4 py-5">
        <StatusStepper status={sub.status} />
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Order lines" />
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-[12px] text-muted">
                  <th className="px-5 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Unit price</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Tax</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pricing.lines.map((l, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-5 py-3">
                      <div className="font-medium">{l.description}</div>
                      {i === 0 && <div className="text-xs text-muted">Plan · billed every {per}</div>}
                    </td>
                    <td className="px-3 py-3 text-right tabular">{l.qty}</td>
                    <td className="hidden px-3 py-3 text-right text-muted tabular sm:table-cell">{money(l.unitPrice)}</td>
                    <td className="hidden px-3 py-3 text-right text-muted tabular sm:table-cell">{l.taxRateBps / 100}%</td>
                    <td className="px-5 py-3 text-right tabular">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line px-5 py-4">
              <div className="ml-auto flex max-w-[280px] flex-col gap-1.5 text-[14px]">
                <Total label="Subtotal" value={money(pricing.subtotal)} />
                {pricing.discountTotal > 0 && <Total label={pricing.discount?.name ?? "Discount"} value={`−${money(pricing.discountTotal)}`} tone="success" />}
                <Total label="Tax" value={money(pricing.taxTotal)} />
                <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
                  <span className="font-medium">Total per {per}</span>
                  <span className="text-[18px] font-semibold tabular">{money(pricing.total)}</span>
                </div>
              </div>
              {pricing.discount && !pricing.discount.applied && (
                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-warning">
                  <BadgePercent className="size-4" /> {pricing.discount.name} isn&apos;t applying: {pricing.discount.reason?.toLowerCase()}.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Invoices" />
            {s.invoices.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">
                {sub.status === "active" ? `The first invoice will be created on ${formatDate(sub.nextInvoiceDate)}.` : "Invoices start once the subscription is active."}
              </p>
            ) : (
              <ul className="px-2 pb-2">
                {s.invoices.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 rounded-xl px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium tabular">{i.number}</div>
                      <div className={`text-xs tabular ${i.overdue ? "text-danger" : "text-muted"}`}>
                        Issued {formatDate(i.issueDate, { short: true })} · due {formatDate(i.dueDate, { short: true })}
                      </div>
                    </div>
                    <span className="text-[14px] tabular">{money(i.total)}</span>
                    <StatusPill status={i.overdue ? "overdue" : i.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold tracking-tight">{customer.name}</h2>
            <p className="text-[13px] text-muted">{customer.email}</p>
            <dl className="mt-4 flex flex-col gap-2.5 text-[13.5px]">
              <Fact label="Start" value={formatDate(sub.startDate)} />
              <Fact label="Expiry" value={sub.expiryDate ? formatDate(sub.expiryDate) : "Until closed"} />
              {sub.status === "active" && <Fact label="Next invoice" value={formatDate(sub.nextInvoiceDate)} />}
              {(sub.status === "quotation" || sub.status === "draft") && <Fact label="Quote valid until" value={formatDate(sub.quoteValidUntil)} />}
              <Fact label="Payment terms" value={`${sub.paymentTermsDays} days`} />
              <Fact label="Monthly recurring" value={sub.status === "active" ? money(sub.mrr, { whole: true }) : "—"} />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold tracking-tight">Activity</h2>
            <Timeline events={s.events} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className={`flex items-baseline justify-between ${tone === "success" ? "text-success" : ""}`}>
      <span className={tone ? undefined : "text-muted"}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium tabular">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-48" />
      <Card className="h-24" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="h-80" />
        <Card className="h-80" />
      </div>
    </div>
  );
}

