import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4", className)} />;
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-3.5">
          <Skeleton className="w-24" />
          <Skeleton className="w-48 flex-1" />
          <Skeleton className="w-20" />
          <Skeleton className="w-16" />
        </div>
      ))}
    </div>
  );
}
