import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/page";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Suspense, type ReactNode } from "react";
import { ListProvider, PendingRegion } from "./list-state";
import { ListToolbar, ToolbarShell, type Segment } from "./toolbar";

// The standard list layout: filter + search on top, streamed results in a card.
export function ListLayout({
  segments,
  placeholder,
  children,
}: {
  segments?: Segment[];
  placeholder?: string;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <>
          <ToolbarShell segments={segments} />
          <Card>
            <TableSkeleton />
          </Card>
        </>
      }
    >
      <ListProvider>
        <ListToolbar segments={segments} placeholder={placeholder} />
        <Card className="overflow-hidden">
          <PendingRegion>
            <Reveal fallback={<TableSkeleton />}>{children}</Reveal>
          </PendingRegion>
        </Card>
      </ListProvider>
    </Suspense>
  );
}

export async function readListParams(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    q: one(sp.q)?.slice(0, 100),
    status: one(sp.status),
    page: Math.max(1, Number(one(sp.page)) || 1),
  };
}
