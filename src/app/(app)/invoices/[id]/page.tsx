import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { Card, CardHeader } from "@/components/ui/card";
import { Page, Reveal } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, StatusPill } from "@/components/ui/status";
import { formatDate, money } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/validation/payment";
import { getInvoice } from "@/server/queries/invoices";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "../../subscriptions/back-link";
import { PaidMeter } from "./paid-meter";

export const metadata: Metadata = { title: "Invoice" };

export default function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  return (
    <Page>
      <BackLink href="/invoices" label="Invoices" />
      <Reveal fallback={<InvoiceSkeleton />}>
        <InvoiceDetail params={params} />
      </Reveal>
    </Page>
  );
}

async function InvoiceDetail({ params }: { params: PageProps<"/invoices/[id]">["params"] }) {
  const { id } = await params;
  const d = await getInvoice(id);
  if (!d) notFound();
  const { inv, customer } = d;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.022em] tabular">{inv.number}</h1>
            <StatusPill status={d.overdue ? "overdue" : inv.status} />
          </div>
          <p className="mt-1 text-[15px] text-muted">
            {customer.name} · <span className="text-fg tabular">{money(inv.total)}</span>
            {d.overdue && <span className="text-danger"> · {d.daysOverdue} days overdue</span>}
          </p>
        </div>
        <InvoiceActions
          invoice={{ id: inv.id, number: inv.number, customer: customer.name, dueDate: inv.dueDate, balance: d.balance }}
          actions={d.actions}
          sent={!!inv.sentAt}
        />
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Lines" />
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
                {d.lines
                  .filter((l) => l.amount >= 0)
                  .map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="px-5 py-3 font-medium">{l.description}</td>
                      <td className="px-3 py-3 text-right tabular">{l.qty}</td>
                      <td className="hidden px-3 py-3 text-right text-muted tabular sm:table-cell">{money(l.unitPrice)}</td>
                      <td className="hidden px-3 py-3 text-right text-muted tabular sm:table-cell">{l.taxRateBps / 100}%</td>
                      <td className="px-5 py-3 text-right tabular">{money(l.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="border-t border-line px-5 py-4">
              <dl className="ml-auto flex max-w-[280px] flex-col gap-1.5 text-[14px]">
                <Row label="Subtotal" value={money(inv.subtotal)} />
                {inv.discountTotal > 0 && <Row label="Discount" value={`−${money(inv.discountTotal)}`} className="text-success" />}
                <Row label="Tax" value={money(inv.taxTotal)} />
                <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
                  <dt className="font-medium">Total</dt>
                  <dd className="text-[18px] font-semibold tabular">{money(inv.total)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            {d.payments.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">{inv.status === "confirmed" ? "No payments yet." : "Payments can be recorded once the invoice is confirmed."}</p>
            ) : (
              <ul className="px-2 pb-2">
                {d.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 rounded-xl px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[14px] font-medium">
                        {PAYMENT_METHOD_LABEL[p.method]}
                        {p.source === "bank_match" && <Pill tone="accent">Auto-matched</Pill>}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {formatDate(p.paidOn)}
                        {p.note && ` · ${p.note}`}
                      </div>
                    </div>
                    <span className="text-[14px] font-medium text-success tabular">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <PaidMeter paid={inv.amountPaid} total={inv.total} cancelled={inv.status === "cancelled"} />
            <dl className="mt-5 flex flex-col gap-2.5 text-[13.5px]">
              <Fact label="Billed to" value={customer.name} />
              <Fact label="Issued" value={formatDate(inv.issueDate)} />
              <Fact label="Due" value={formatDate(inv.dueDate)} tone={d.overdue ? "danger" : undefined} />
              <Fact label="Period" value={`${formatDate(inv.periodStart, { short: true })} – ${formatDate(inv.periodEnd, { short: true })}`} />
              <Fact label="Emailed" value={inv.sentAt ? formatDate(inv.sentAt) : "Not yet"} />
              {inv.subscriptionId && d.subscriptionNumber && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Subscription</dt>
                  <dd>
                    <Link href={`/subscriptions/${inv.subscriptionId}`} className="font-medium text-accent tabular hover:underline">
                      {d.subscriptionNumber}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between ${className ?? ""}`}>
      <dt className={className ? undefined : "text-muted"}>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-medium tabular ${tone === "danger" ? "text-danger" : ""}`}>{value}</dd>
    </div>
  );
}

function InvoiceSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="h-80" />
        <Card className="h-64" />
      </div>
    </div>
  );
}
