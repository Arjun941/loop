"use client";
/**
 * Sticky header for the landing page. Clear at the top of the page; once the page scrolls it
 * picks up a translucent, blurred background and a hairline, like a macOS toolbar.
 */
import { LogoWordmark } from "@/components/shell/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#ai", label: "AI" },
];

export function MarketingHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-line bg-elevated backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Loop home" className="rounded-lg">
          <LogoWordmark size={26} />
        </Link>
        <nav aria-label="Sections" className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-[13.5px] text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ButtonLink href="/login" variant="ghost" size="sm" className="text-muted hover:text-fg">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm" className="rounded-full px-3.5">
            Get started
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
