import { ListLayout, readListParams } from "@/components/list/list-page";
import { Pagination } from "@/components/list/pagination";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { listInvoices, PAGE_SIZE } from "@/server/queries/lists";
import { formatDate, money } from "@/lib/format";
import { FileText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Invoices" };

const SEGMENTS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "confirmed", label: "Confirmed" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Drafts" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  return (
    <Page>
      <PageHeader
        title="Invoices"
        subtitle="Generated from subscriptions. Never typed by hand."
        actions={
          <ButtonLink href="/billing">
            <Sparkles className="size-4" strokeWidth={2.2} /> Billing day
          </ButtonLink>
        }
      />
      <ListLayout segments={SEGMENTS} placeholder="Search number or customer">
        <Results searchParams={searchParams} />
      </ListLayout>
    </Page>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/invoices">["searchParams"] }) {
  const params = await readListParams(searchParams);
  const { rows, total } = await listInvoices(params);

  if (rows.length === 0) {
    return <EmptyState icon={<FileText className="size-5" />} title="No invoices found" body="Try a different filter or search." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Number</Th>
            <Th>Customer</Th>
            <Th>Status</Th>
            <Th className="hidden xl:table-cell">Issued</Th>
            <Th>Due</Th>
            <Th align="right">Total</Th>
            <Th align="right">Balance</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <Tr key={i.id} className="cursor-pointer">
              <Td className="font-medium tabular">
                <Link href={`/invoices/${i.id}`} className="after:absolute after:inset-0">
                  {i.number}
                </Link>
              </Td>
              <Td>{i.customer}</Td>
              <Td>
                <StatusPill status={i.overdue ? "overdue" : i.status} />
              </Td>
              <Td className="hidden text-muted tabular xl:table-cell">{formatDate(i.issueDate)}</Td>
              <Td className={i.overdue ? "text-danger tabular" : "text-muted tabular"}>{formatDate(i.dueDate)}</Td>
              <Td align="right">{money(i.total)}</Td>
              <Td align="right" className={i.total - i.amountPaid > 0 && i.status !== "cancelled" ? "" : "text-subtle"}>
                {i.status === "cancelled" ? "—" : money(i.total - i.amountPaid)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={params.page} total={total} pageSize={PAGE_SIZE} noun="invoices" />
    </>
  );
}
