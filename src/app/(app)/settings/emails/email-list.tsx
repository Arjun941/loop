"use client";
/**
 * The Outbox: every email the app has sent (or held, when no provider is configured).
 * Clicking a row previews the exact HTML the recipient sees.
 */
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { useState, useTransition } from "react";
import { loadEmailPreview } from "./actions";

type Row = { id: string; to: string; subject: string; template: string; status: string; createdAt: string };

const STATUS = {
  sent: { tone: "success", label: "Delivered" },
  outbox: { tone: "warning", label: "Outbox" },
  failed: { tone: "danger", label: "Failed" },
} as const;

const time = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function EmailList({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function open(row: Row) {
    setSelected(row);
    setHtml(null);
    startTransition(async () => setHtml(await loadEmailPreview(row.id)));
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const status = STATUS[r.status as keyof typeof STATUS] ?? STATUS.outbox;
          return (
            <li key={r.id}>
              <button onClick={() => open(r)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-hover">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{r.subject}</div>
                  <div className="truncate text-xs text-muted">to {r.to}</div>
                </div>
                <span className="hidden text-xs text-muted sm:block">{time.format(new Date(r.createdAt))}</span>
                <Pill tone={status.tone}>{status.label}</Pill>
              </button>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.subject ?? ""} description={selected && `to ${selected.to}`} width={640}>
        {html ? (
          // Scripts stay blocked; same-origin only lets the frame render our own template HTML normally.
          <iframe
            title="Email preview"
            srcDoc={html.replace("<head>", '<head><base target="_blank">')}
            sandbox="allow-same-origin allow-popups"
            className="h-[70vh] w-full rounded-xl bg-[#f5f5f7]"
          />
        ) : (
          <div className="skeleton h-[70vh] w-full rounded-xl" />
        )}
      </Sheet>
    </>
  );
}
