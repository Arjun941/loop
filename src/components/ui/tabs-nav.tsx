"use client";
/**
 * Link-based tabs for sub-pages, with the same sliding highlight as the segmented filters.
 */
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

export function TabsNav({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const layoutId = useId();
  return (
    <nav className="mb-6 flex h-9 w-fit max-w-full overflow-x-auto rounded-[11px] bg-neutral-soft p-[3px]">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative flex items-center rounded-[8px] px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[8px] bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
