import { Card, CardHeader } from "@/components/ui/card";
import { Page, Reveal } from "@/components/ui/page";
import { TableSkeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { formatDate, money } from "@/lib/format";
import { getPortalOverview } from "@/server/queries/portal";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your account" };

export default function PortalPage() {
  return (
    <Page>
      <Reveal fallback={<Card><TableSkeleton rows={6} /></Card>}>
        <Overview />
      </Reveal>
    </Page>
  );
}

async function Overview() {
  const o = await getPortalOverview();
  const due = o.invoices.filter((i) => i.status === "confirmed").reduce((sum, i) => sum + i.total - i.amountPaid, 0);

  return (
    <div className="mx-auto max-w-[880px]">
      <h1 className="text-[28px] font-semibold tracking-[-0.022em]">Hi, {o.firstName}</h1>
      <p className="mt-1 text-[15px] text-muted">
        {o.company} · {due > 0 ? <span className="text-fg">{money(due)} due</span> : "You're all paid up"}
      </p>

      <Card className="mt-7">
        <CardHeader title="Subscriptions" />
        {o.subscriptions.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted">You don&apos;t have any subscriptions yet.</p>
        ) : (
          <ul className="px-2 pb-2">
            {o.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center gap-4 rounded-xl px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{s.plan}</div>
                  <div className="text-xs text-muted tabular">
                    {s.number}
                    {s.status === "active" && s.nextInvoiceDate && ` · renews ${formatDate(s.nextInvoiceDate)}`}
                  </div>
                </div>
                {s.status === "active" && <span className="text-sm text-muted tabular">{money(s.mrr, { whole: true })}/mo</span>}
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Invoices" />
        {o.invoices.length === 0 && <p className="px-5 pb-5 text-sm text-muted">No invoices yet.</p>}
        <ul className="px-2 pb-2">
          {o.invoices.map((i) => (
            <li key={i.id} className="flex items-center gap-4 rounded-xl px-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium tabular">{i.number}</div>
                <div className={`text-xs tabular ${i.overdue ? "text-danger" : "text-muted"}`}>
                  {i.status === "paid" ? `Issued ${formatDate(i.issueDate)}` : `Due ${formatDate(i.dueDate)}`}
                </div>
              </div>
              <span className="text-[14px] font-medium tabular">{money(i.total)}</span>
              <StatusPill status={i.overdue ? "overdue" : i.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
