import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-[14px]", className)} {...props} />
    </div>
  );
}

export function Th({ className, align, ...props }: ComponentProps<"th"> & { align?: "right" }) {
  return (
    <th
      className={cn(
        "h-10 border-b border-line px-3 text-left first:pl-5 last:pr-5 text-[12px] font-medium whitespace-nowrap text-muted",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, align, ...props }: ComponentProps<"td"> & { align?: "right" }) {
  return (
    <td
      className={cn("h-[52px] px-3 whitespace-nowrap first:pl-5 last:pr-5", align === "right" && "tabular text-right", className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("relative border-b border-line transition-colors duration-100 last:border-0 hover:bg-hover", className)}
      {...props}
    />
  );
}
