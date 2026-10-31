import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

const STATUS_TONE: Record<string, Tone> = {
  draft: "neutral",
  quotation: "accent",
  confirmed: "accent",
  active: "success",
  paused: "warning",
  closed: "neutral",
  paid: "success",
  cancelled: "neutral",
  overdue: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  quotation: "Quotation",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Pill tone={tone}>
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </Pill>
  );
}
