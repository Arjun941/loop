import { ListLayout, readListParams } from "@/components/list/list-page";
import { Pagination } from "@/components/list/pagination";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { listSubscriptions, PAGE_SIZE } from "@/server/queries/lists";
import { formatDate, money } from "@/lib/format";
import { Plus, Repeat } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Subscriptions" };

const SEGMENTS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "quotation", label: "Quotations" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

export default function SubscriptionsPage({ searchParams }: PageProps<"/subscriptions">) {
  return (
    <Page>
      <PageHeader
        title="Subscriptions"
        subtitle="Every recurring agreement, from first quote to renewal."
        actions={
          <ButtonLink href="/subscriptions/new">
            <Plus className="size-4" strokeWidth={2.2} /> New subscription
          </ButtonLink>
        }
      />
      <ListLayout segments={SEGMENTS} placeholder="Search number or customer">
        <Results searchParams={searchParams} />
      </ListLayout>
    </Page>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/subscriptions">["searchParams"] }) {
  const params = await readListParams(searchParams);
  const { rows, total } = await listSubscriptions(params);

  if (rows.length === 0) {
    return <EmptyState icon={<Repeat className="size-5" />} title="No subscriptions found" body="Try a different filter or search." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Number</Th>
            <Th>Customer</Th>
            <Th>Plan</Th>
            <Th>Status</Th>
            <Th>Next invoice</Th>
            <Th align="right">MRR</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <Tr key={s.id} className="cursor-pointer">
              <Td className="font-medium tabular">
                <Link href={`/subscriptions/${s.id}`} className="after:absolute after:inset-0">
                  {s.number}
                </Link>
              </Td>
              <Td>{s.customer}</Td>
              <Td className="text-muted">{s.plan}</Td>
              <Td>
                <StatusPill status={s.status} />
              </Td>
              <Td className="text-muted tabular">{s.status === "active" ? formatDate(s.nextInvoiceDate) : "—"}</Td>
              <Td align="right">{money(s.mrr)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={params.page} total={total} pageSize={PAGE_SIZE} noun="subscriptions" />
    </>
  );
}
