import { ListLayout, readListParams } from "@/components/list/list-page";
import { Pagination } from "@/components/list/pagination";
import { RecordPaymentButton } from "@/components/invoices/invoice-actions";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { Pill } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { listPayments, PAGE_SIZE } from "@/server/queries/lists";
import { formatDate, money } from "@/lib/format";
import { CreditCard, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payments" };

const METHOD: Record<string, string> = { bank: "Bank transfer", card: "Card", upi: "UPI", cash: "Cash", cheque: "Cheque" };

export default function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  return (
    <Page>
      <PageHeader
        title="Payments"
        subtitle="Money in, matched to the right invoice."
        actions={
          <>
            <ButtonLink href="/payments/reconcile" variant="secondary">
              <Upload className="size-4" strokeWidth={2.2} /> Match bank statement
            </ButtonLink>
            <RecordPaymentButton />
          </>
        }
      />
      <ListLayout placeholder="Search invoice or customer">
        <Results searchParams={searchParams} />
      </ListLayout>
    </Page>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/payments">["searchParams"] }) {
  const params = await readListParams(searchParams);
  const { rows, total } = await listPayments(params);

  if (rows.length === 0) {
    return <EmptyState icon={<CreditCard className="size-5" />} title="No payments yet" body="Recorded payments will appear here." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Customer</Th>
            <Th>Invoice</Th>
            <Th>Method</Th>
            <Th>Note</Th>
            <Th align="right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Tr key={p.id}>
              <Td className="text-muted tabular">{formatDate(p.paidOn)}</Td>
              <Td>{p.customer}</Td>
              <Td className="tabular">
                <Link href={`/invoices/${p.invoiceId}`} className="text-accent hover:underline">
                  {p.invoice}
                </Link>
              </Td>
              <Td>
                <span className="flex items-center gap-2">
                  {METHOD[p.method]}
                  {p.source === "bank_match" && <Pill tone="accent">Auto-matched</Pill>}
                </span>
              </Td>
              <Td className="max-w-[220px] truncate text-muted">{p.note ?? "—"}</Td>
              <Td align="right" className="font-medium">
                {money(p.amount)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={params.page} total={total} pageSize={PAGE_SIZE} noun="payments" />
    </>
  );
}
