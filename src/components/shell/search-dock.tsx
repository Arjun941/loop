"use client";
/**
 * The search pill that opens the command bar (⌘K).
 *
 * - `floating` (desktop): a glass pill at the top of the content area. It slips away while you
 *   scroll down through content and comes back as soon as you scroll up.
 * - `inline` (phones): sits in the header row between the logo and the account button.
 */
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState, ViewTransition } from "react";

function openCommandBar() {
  window.dispatchEvent(new CustomEvent("loop:command"));
}

export function SearchDock({ variant = "floating" }: { variant?: "floating" | "inline" }) {
  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={openCommandBar}
        aria-label="Search or jump to"
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-elevated px-3.5 text-[14px] text-subtle shadow-sm backdrop-blur-xl"
      >
        <Search className="size-4 shrink-0 text-muted" strokeWidth={2.2} />
        <span className="truncate">Search or jump to…</span>
      </button>
    );
  }
  return <FloatingSearch />;
}

function FloatingSearch() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    // Hide only after a deliberate scroll down past the top; any upward scroll brings it back.
    if (y > previous + 4 && y > 80) setHidden(true);
    else if (y < previous - 4) setHidden(false);
  });

  return (
    <ViewTransition name="search-dock">
      <div className="pointer-events-none fixed top-4 right-0 left-[232px] z-30 hidden justify-center px-6 md:flex">
        <motion.button
          type="button"
          onClick={openCommandBar}
          initial={{ y: -24, opacity: 0 }}
          animate={hidden ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Search or jump to (⌘K)"
          className={cn(
            "pointer-events-auto flex h-11 w-full max-w-[440px] items-center gap-2.5 rounded-full border border-line bg-elevated pr-2 pl-4",
            "text-[14.5px] text-subtle shadow-md backdrop-blur-2xl backdrop-saturate-150",
          )}
        >
          <Search className="size-[17px] text-muted" strokeWidth={2.2} />
          <span>Search or jump to…</span>
          <kbd className="ml-auto flex h-7 items-center rounded-full bg-neutral-soft px-2.5 font-sans text-[12px] text-muted">⌘K</kbd>
        </motion.button>
      </div>
    </ViewTransition>
  );
}
