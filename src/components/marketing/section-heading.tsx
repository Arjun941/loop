import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Reveal } from "./motion";

/** Eyebrow, headline and one supporting line, shared by every landing section. */
export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  tone = "page",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "center" | "left";
  /** `dark` for sections that sit on a dark brand surface. */
  tone?: "page" | "dark";
  className?: string;
}) {
  return (
    <Reveal className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl", className)}>
      <p className={cn("text-[13px] font-semibold tracking-wide", tone === "dark" ? "text-[#4ea1ff]" : "text-accent")}>{eyebrow}</p>
      <h2 className="mt-3 text-[34px] leading-[1.06] font-semibold tracking-[-0.04em] text-balance sm:text-[48px]">{title}</h2>
      {body && (
        <p
          className={cn(
            "mt-5 text-[17px] leading-relaxed text-pretty sm:text-[19px]",
            tone === "dark" ? "text-white/60" : "text-muted",
            align === "center" && "mx-auto max-w-xl",
          )}
        >
          {body}
        </p>
      )}
    </Reveal>
  );
}
