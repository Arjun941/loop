"use client";

import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, use, useTransition, type ReactNode } from "react";

type ListCtx = { pending: boolean; setParams: (patch: Record<string, string | null>) => void };
const Ctx = createContext<ListCtx | null>(null);

// Shares URL-driven list state (search, filter, page) and its pending state between controls and results.
export function ListProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return <Ctx value={{ pending, setParams }}>{children}</Ctx>;
}

export function useList() {
  const ctx = use(Ctx);
  if (!ctx) throw new Error("useList must be used within ListProvider");
  return ctx;
}

export function PendingRegion({ children }: { children: ReactNode }) {
  const { pending } = useList();
  return (
    <div
      className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-55")}
      aria-busy={pending}
    >
      {children}
    </div>
  );
}
