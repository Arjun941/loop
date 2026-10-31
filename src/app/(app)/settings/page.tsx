import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui/status";
import { getCompany } from "@/server/queries/settings";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function GeneralSettingsPage() {
  return (
    <Reveal fallback={<Card className="p-5"><Skeleton className="w-48" /><Skeleton className="mt-4 w-64" /></Card>}>
      <General />
    </Reveal>
  );
}

async function General() {
  const c = await getCompany();
  const rows: [string, React.ReactNode][] = [
    ["Company", c.name],
    ["Currency", c.currency],
    ["Invoice prefix", c.invoicePrefix],
    ["Default payment terms", `${c.defaultPaymentTermsDays} days`],
    [
      "Email delivery",
      c.emailProvider ? <Pill tone="success">{c.emailProvider} connected</Pill> : <Pill tone="warning">Not configured · using Outbox</Pill>,
    ],
  ];
  return (
    <Card>
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
