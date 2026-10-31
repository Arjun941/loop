import { ListLayout, readListParams } from "@/components/list/list-page";
import { Pagination } from "@/components/list/pagination";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { listCustomers, PAGE_SIZE } from "@/server/queries/lists";
import { money } from "@/lib/format";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { NewCustomerButton } from "./new-customer-button";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <Page>
      <PageHeader
        title="Customers"
        subtitle="Who pays you, and how they're doing."
        actions={<NewCustomerButton />}
      />
      <ListLayout placeholder="Search name or email">
        <Results searchParams={searchParams} />
      </ListLayout>
    </Page>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/customers">["searchParams"] }) {
  const params = await readListParams(searchParams);
  const { rows, total } = await listCustomers(params);

  if (rows.length === 0) {
    return <EmptyState icon={<Users className="size-5" />} title="No customers found" body="Try a different search." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th align="right">Active</Th>
            <Th align="right">MRR</Th>
            <Th align="right">Balance due</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <Tr key={c.id}>
              <Td>
                <div className="font-medium">{c.name}</div>
                {c.company && c.company !== c.name && <div className="text-xs text-muted">{c.company}</div>}
              </Td>
              <Td className="text-muted">{c.email}</Td>
              <Td align="right">{c.activeSubs}</Td>
              <Td align="right">{money(c.mrr)}</Td>
              <Td align="right" className={c.balance > 0 ? "text-fg" : "text-subtle"}>
                {money(c.balance)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={params.page} total={total} pageSize={PAGE_SIZE} noun="customers" />
    </>
  );
}
