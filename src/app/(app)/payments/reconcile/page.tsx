import { Card } from "@/components/ui/card";
import { Page, PageHeader, Reveal } from "@/components/ui/page";
import { TableSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/server/auth/access";
import { getImport } from "@/server/services/reconcile";
import type { Metadata } from "next";
import { BackLink } from "../../subscriptions/back-link";
import { ImportResults } from "./import-results";
import { StatementDrop } from "./statement-drop";

export const metadata: Metadata = { title: "Match bank statement" };

export default function ReconcilePage({ searchParams }: PageProps<"/payments/reconcile">) {
  return (
    <Page>
      <BackLink href="/payments" label="Payments" />
      <PageHeader title="Match bank statement" subtitle="Drop your bank's CSV export. Loop finds the invoice behind each payment." />
      <Reveal fallback={<Card><TableSkeleton rows={6} /></Card>}>
        <Content searchParams={searchParams} />
      </Reveal>
    </Page>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/payments/reconcile">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const id = typeof sp.import === "string" && /^[0-9a-f-]{36}$/.test(sp.import) ? sp.import : null;
  const imp = id ? await getImport(id) : null;
  if (!imp) return <StatementDrop />;
  return <ImportResults data={imp} />;
}
