"use client";
/**
 * The Outbox: every email the app has sent (or held, when no provider is configured).
 * Clicking a row previews the exact HTML the recipient sees.
 */
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { useState, useTransition } from "react";
import { loadEmailPreview } from "./actions";

type Row = { id: string; to: string; subject: string; template: string; status: string; sentAt: string };

const STATUS = {
  sent: { tone: "success", label: "Delivered" },
  outbox: { tone: "warning", label: "Outbox" },
  failed: { tone: "danger", label: "Failed" },
} as const;

export function EmailList({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof loadEmailPreview>> | "loading">("loading");
  const [, startTransition] = useTransition();

  function open(row: Row) {
    setSelected(row);
    setPreview("loading");
    startTransition(async () => setPreview(await loadEmailPreview(row.id)));
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
                <span className="hidden text-xs text-muted sm:block">{r.sentAt}</span>
                <Pill tone={status.tone}>{status.label}</Pill>
              </button>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.subject ?? ""} description={selected && `to ${selected.to}`} width={640}>
        {preview === "loading" ? (
          <div className="skeleton h-[70vh] w-full rounded-xl" />
        ) : preview && "html" in preview ? (
          // Scripts stay blocked; same-origin only lets the frame render our own template HTML normally.
          <iframe
            title="Email preview"
            srcDoc={preview.html.replace("<head>", '<head><base target="_blank">')}
            sandbox="allow-same-origin allow-popups"
            className="h-[70vh] w-full rounded-xl bg-[#f5f5f7]"
          />
        ) : (
          <p className="rounded-xl bg-hover px-5 py-10 text-center text-[14px] text-muted">
            {preview ? "This email contains a private sign-in link, so its contents aren't kept." : "This email is no longer available."}
          </p>
        )}
      </Sheet>
    </>
  );
}
