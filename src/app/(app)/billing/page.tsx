import { BillingDay } from "@/components/billing/billing-day";
import { Card } from "@/components/ui/card";
import { Page, PageHeader, Reveal } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillingPreview } from "@/server/queries/billing";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing day" };

export default function BillingPage({ searchParams }: PageProps<"/billing">) {
  return (
    <Page>
      <PageHeader title="Billing day" subtitle="See every invoice before it exists. Then create and send them all at once." />
      <Reveal fallback={<BillingSkeleton />}>
        <Preview searchParams={searchParams} />
      </Reveal>
    </Page>
  );
}

async function Preview({ searchParams }: { searchParams: PageProps<"/billing">["searchParams"] }) {
  const sp = await searchParams;
  const raw = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : null;
  const preview = await getBillingPreview(raw);
  return <BillingDay preview={preview} />;
}

function BillingSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
          </Card>
        ))}
      </div>
      <Card className="h-96" />
    </div>
  );
}
