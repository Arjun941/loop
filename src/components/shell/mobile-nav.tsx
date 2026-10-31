"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Suspense } from "react";
import { isActive, NAV } from "./nav";

// Bottom tab bar on small screens, like iOS.
export function MobileNav() {
  // The current section is only known per request; the unhighlighted bar is the instant shell.
  return (
    <Suspense fallback={<TabBar segment={undefined} />}>
      <CurrentTabBar />
    </Suspense>
  );
}

function CurrentTabBar() {
  return <TabBar segment={useSelectedLayoutSegment()} />;
}

function TabBar({ segment }: { segment: string | null | undefined }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-elevated pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
        const active = segment !== undefined && isActive(segment, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              active ? "text-accent" : "text-muted",
            )}
          >
            <Icon className="size-[22px]" strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
