/**
 * The history of a subscription: who changed what, when, and what it did to monthly revenue.
 */
import { STATUS_LABEL, type SubscriptionStatus } from "@/lib/domain/subscription-status";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CircleDot, FileText, Pause, Play, Power, RefreshCw, Send, ThumbsUp } from "lucide-react";

type Event = { id: string; fromStatus: SubscriptionStatus | null; toStatus: SubscriptionStatus; mrrDelta: number; note: string | null; at: Date; actor: string | null };

const time = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function describe(e: Event) {
  if (e.note && e.fromStatus === e.toStatus) return { icon: RefreshCw, text: e.note, tone: "accent" };
  if (!e.fromStatus) return { icon: FileText, text: e.toStatus === "draft" ? "Draft created" : `Created as ${STATUS_LABEL[e.toStatus].toLowerCase()}`, tone: "neutral" };
  switch (e.toStatus) {
    case "quotation":
      return { icon: Send, text: "Quotation sent", tone: "accent" };
    case "confirmed":
      return { icon: ThumbsUp, text: "Customer accepted", tone: "accent" };
    case "active":
      return e.fromStatus === "paused" ? { icon: Play, text: "Resumed", tone: "success" } : { icon: Play, text: "Activated", tone: "success" };
    case "paused":
      return { icon: Pause, text: "Paused", tone: "warning" };
    case "closed":
      return { icon: Power, text: e.fromStatus === "draft" || e.fromStatus === "quotation" ? "Discarded" : "Closed", tone: "neutral" };
    case "draft":
      return { icon: CircleDot, text: "Moved back to draft", tone: "neutral" };
  }
}

const TONE: Record<string, string> = {
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-neutral-soft text-muted",
};

export function Timeline({ events }: { events: Event[] }) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const { icon: Icon, text, tone } = describe(e);
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-line" />}
            <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-full", TONE[tone])}>
              <Icon className="size-3.5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[14px] font-medium">{text}</span>
                {e.mrrDelta !== 0 && (
                  <span className={cn("text-[12.5px] font-medium tabular", e.mrrDelta > 0 ? "text-success" : "text-danger")}>
                    {e.mrrDelta > 0 ? "+" : "−"}
                    {money(Math.abs(e.mrrDelta), { whole: true })} MRR
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-muted">
                {time.format(e.at)}
                {e.actor && ` · ${e.actor}`}
                {e.note && e.fromStatus !== e.toStatus && e.note !== "Created" && ` · ${e.note}`}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
