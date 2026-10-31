import { AgingBars } from "@/components/charts/aging-bars";
import { BilledCollected } from "@/components/charts/columns";
import { Waterfall } from "@/components/charts/waterfall";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page, PageHeader, Reveal } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui/status";
import { money, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDashboard, RANGES, type Range } from "@/server/queries/dashboard";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardFilters } from "./filters";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Page>
      <PageHeader title="Home" subtitle="Recurring revenue, what's been collected, and what needs attention." />
      <Reveal fallback={<DashboardSkeleton />}>
        <Overview searchParams={searchParams} />
      </Reveal>
    </Page>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sp = await searchParams;
  const range = (typeof sp.range === "string" && sp.range in RANGES ? sp.range : "90d") as Range;
  const planId = typeof sp.plan === "string" && /^[0-9a-f-]{36}$/.test(sp.plan) ? sp.plan : null;
  const d = await getDashboard({ range, planId });
  const change = d.mrr.now - d.mrr.start;
  const changePct = d.mrr.start > 0 ? (change / d.mrr.start) * 100 : 0;
  const rangeLabel = RANGES[range].toLowerCase();

  return (
    <DashboardFilters range={range} planId={planId} ranges={RANGES} plans={d.plans}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Monthly recurring revenue"
            value={<AnimatedNumber value={d.mrr.now} format="money" />}
            hint={
              <span className={cn("inline-flex items-center gap-0.5", change >= 0 ? "text-success" : "text-danger")}>
                {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {money(Math.abs(change), { compact: true })} ({changePct.toFixed(1)}%) {rangeLabel}
              </span>
            }
          />
          <Stat label={`Collected · ${rangeLabel}`} value={<AnimatedNumber value={d.collected} format="money" />} hint={`${money(d.billed, { compact: true })} billed`} />
          <Stat label="Outstanding" value={<AnimatedNumber value={d.outstanding} format="money" />} hint={`${number(d.mrr.active)} active subscriptions`} />
          <Stat label="Overdue" value={<AnimatedNumber value={d.overdue.amount} format="money" />} tone="danger" hint={`${number(d.overdue.count)} invoices`} />
        </div>

        {d.dueForBilling > 0 && (
          <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
            <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <CalendarClock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold tracking-tight">{number(d.dueForBilling)} subscriptions are due for billing</div>
              <div className="text-sm text-muted">Preview every invoice before anything goes out.</div>
            </div>
            <ButtonLink href="/billing" className="w-full sm:w-auto">
              Open billing day <ArrowRight className="size-4" />
            </ButtonLink>
          </Card>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Revenue movement" subtitle={`How monthly recurring revenue changed, ${rangeLabel}`}>
            <Waterfall
              steps={[
                { label: "Start", amount: d.movement.start, kind: "total" },
                { label: "New", amount: d.movement.new.amount, count: d.movement.new.count, kind: "delta" },
                { label: "Resumed", amount: d.movement.resumed.amount, count: d.movement.resumed.count, kind: "delta" },
                { label: "Paused", amount: d.movement.paused.amount, count: d.movement.paused.count, kind: "delta" },
                { label: "Churned", amount: d.movement.churned.amount, count: d.movement.churned.count, kind: "delta" },
                { label: "Now", amount: d.movement.end, kind: "total" },
              ]}
            />
          </Panel>

          <Panel
            title="Revenue at risk"
            subtitle={`${money(d.risk.owed, { compact: true })} overdue · ${money(d.risk.recurring, { compact: true })}/mo paused or ending`}
          >
            {d.risk.items.length === 0 ? (
              <p className="text-sm text-muted">Nothing at risk right now.</p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {d.risk.items.map((r) => (
                  <li key={r.key}>
                    <Link href={r.href} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-hover">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium">{r.label}</div>
                        <div className="truncate text-xs text-muted">{r.detail}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13.5px] font-medium tabular">
                          {money(r.amount, { whole: true })}
                          {r.kind !== "overdue" && <span className="text-muted">/mo</span>}
                        </div>
                        <Pill tone={r.kind === "overdue" ? "danger" : "warning"} className="mt-0.5 h-5 text-[11px]">
                          {r.kind === "overdue" ? "Overdue" : r.kind === "paused" ? "Paused" : "Ending"}
                        </Pill>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel title="Billed vs collected" subtitle="Last 12 months">
            <BilledCollected data={d.monthly} />
          </Panel>
          <Panel
            title="Overdue by age"
            subtitle={`${money(d.overdue.amount, { compact: true })} across ${number(d.overdue.count)} invoices`}
            action={
              <Link href="/invoices?status=overdue" className="text-[13px] text-accent hover:underline">
                See all
              </Link>
            }
          >
            <AgingBars buckets={d.aging} />
          </Panel>
        </div>
      </div>
    </DashboardFilters>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1.5 text-[19px] leading-none font-semibold tracking-[-0.025em] sm:text-[26px] ${tone === "danger" ? "text-danger" : ""}`}>{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-80 rounded-[11px]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="w-28" />
            <Skeleton className="mt-3 h-7 w-36" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="h-80" />
        <Card className="h-80" />
      </div>
    </div>
  );
}
