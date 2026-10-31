/**
 * The Loop mark: one continuous stroke that circles back on itself and carries on, rising.
 * A billing cycle that repeats, and revenue that grows with each turn. Drawn on the blue tile.
 */
import { cn } from "@/lib/utils";
import { useId } from "react";

/** The loop stroke on a 32×32 grid (shared with `app/icon.svg`). */
export const LOOP_PATH = "M6 23C14 23 21.5 20.5 21.5 14A5.5 5.5 0 0 0 10.5 14C10.5 20.5 18 23 26 23";
export const LOOP_TRANSFORM = "rotate(-14 16 16.5)";

export function Logo({ size = 26 }: { size?: number }) {
  // A unique gradient id per instance: a shared id breaks when the defining copy is hidden.
  const gradient = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a84ff" />
          <stop offset="1" stopColor="#5e5ce6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradient})`} />
      <path
        d={LOOP_PATH}
        transform={LOOP_TRANSFORM}
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The mark with the name beside it, for the marketing header and footer. */
export function LogoWordmark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <Logo size={size} />
      <span className="font-semibold tracking-[-0.02em]" style={{ fontSize: Math.round(size * 0.66) }}>
        Loop
      </span>
    </span>
  );
}
