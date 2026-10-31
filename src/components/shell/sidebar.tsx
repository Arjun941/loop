"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { Logo } from "./logo";
import { isActive, NAV, SECONDARY_NAV } from "./nav";

export function Sidebar({ footer }: { footer?: React.ReactNode }) {
  return (
    <ViewTransition name="sidebar">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-surface-2/60 px-3 py-4 backdrop-blur-xl md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Loop</span>
        </Link>

        {/* The current section is only known per request; the unhighlighted nav is the instant shell. */}
        <Suspense fallback={<NavLinks segment={undefined} />}>
          <CurrentNavLinks />
        </Suspense>

        <div className="flex flex-col gap-0.5">{footer}</div>
      </aside>
    </ViewTransition>
  );
}

function CurrentNavLinks() {
  return <NavLinks segment={useSelectedLayoutSegment()} />;
}

/** `segment` undefined means "unknown yet": nothing is highlighted. */
function NavLinks({ segment }: { segment: string | null | undefined }) {
  const active = (href: string) => segment !== undefined && isActive(segment, href);
  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} active={active(item.href)} />
        ))}
      </nav>
      <nav className="mt-auto flex flex-col gap-0.5">
        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.href} {...item} active={active(item.href)} />
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] transition-colors duration-150",
        active ? "text-fg" : "text-muted hover:bg-hover hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-[10px] bg-surface shadow-sm"
          transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.8 }}
        />
      )}
      <Icon className={cn("relative size-[17px]", active && "text-accent")} strokeWidth={1.9} />
      <span className="relative font-medium">{label}</span>
    </Link>
  );
}
