import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="flex flex-col gap-4 p-5">
        <Skeleton className="w-24" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-2/3 rounded-xl" />
      </Card>
      <Card className="h-72 p-5">
        <Skeleton className="w-20" />
      </Card>
    </div>
  );
}
