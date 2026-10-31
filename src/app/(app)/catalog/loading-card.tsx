import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";

export function LoadingCard() {
  return (
    <Card>
      <TableSkeleton rows={5} />
    </Card>
  );
}
