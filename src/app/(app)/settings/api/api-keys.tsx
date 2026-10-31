"use client";
/**
 * Connect Loop to an LLM: the MCP endpoint, API keys, and copy-ready setup for common clients.
 */
import { Input } from "@/components/form/controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pill } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

type Key = { id: string; name: string; prefix: string; owner: string; createdAt: string; lastUsedAt: string | null };

const TOOLS = [
  "get_overview",
  "search_customers",
  "list_subscriptions",
  "get_subscription",
  "list_invoices",
  "get_invoice",
  "get_catalog",
  "preview_billing",
  "create_customer",
  "create_subscription",
  "subscription_action",
  "invoice_action",
  "record_payment",
  "run_billing",
  "send_reminders",
];

export function ApiKeys({ endpoint, keys, canManage }: { endpoint: string; keys: Key[]; canManage: boolean }) {
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [revoking, setRevoking] = useState<Key | null>(null);

  function create() {
    start(async () => {
      const r = await createApiKeyAction(name);
      if ("error" in r) return void toast.error(r.error);
      setCreated(r.key);
      setName("");
    });
  }

  const shownKey = created ?? "loop_sk_…";

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="text-[17px] font-semibold tracking-tight">Connect Loop to an LLM</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Loop has a built-in MCP server. Connect Claude or any MCP client and ask questions (&ldquo;what&apos;s overdue this week?&rdquo;) or take actions (record a
          payment, run billing). Each key acts as the admin who created it, with the same rules as the app.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-neutral-soft px-3.5 py-2.5 font-mono text-[13px]">{endpoint}</code>
          <CopyButton value={endpoint} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <span key={t} className="rounded-md bg-neutral-soft px-2 py-0.5 font-mono text-[11.5px] text-muted">
              {t}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">API keys</h2>
            <p className="text-[13px] text-muted">{canManage ? "Create one key per tool or person, and revoke it when it's no longer needed." : "Only an admin can create keys."}</p>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-col gap-2 px-5 pb-4 sm:flex-row">
            <Input placeholder="Key name, e.g. Claude Desktop" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button onClick={create} disabled={pending || name.trim().length < 2} className="h-11 shrink-0 rounded-xl">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create key
            </Button>
          </div>
        )}

        <AnimatePresence>
          {created && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-5 pb-4">
              <div className="rounded-xl border border-success/30 bg-success-soft p-4">
                <div className="text-[14px] font-medium text-success">Copy your key now. It won&apos;t be shown again.</div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-[13px]">{created}</code>
                  <CopyButton value={created} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {keys.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted">No keys yet.</p>
        ) : (
          <ul className="px-2 pb-2">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 rounded-xl px-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neutral-soft text-muted">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">{k.name}</div>
                  <div className="truncate text-xs text-muted">
                    <span className="font-mono">{k.prefix}…</span> · by {k.owner} · {k.lastUsedAt ? `last used ${formatDate(k.lastUsedAt)}` : "never used"}
                  </div>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setRevoking(k)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Setup endpoint={endpoint} apiKey={shownKey} />

      <ConfirmDialog
        open={!!revoking}
        title={`Revoke “${revoking?.name}”?`}
        body="Anything using this key stops working immediately."
        confirmLabel="Revoke key"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            if (!revoking) return;
            const r = await revokeApiKeyAction(revoking.id);
            setRevoking(null);
            if (r.ok) toast.success("Key revoked");
            else toast.error(r.error ?? "Couldn't revoke the key");
          })
        }
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
}

function Setup({ endpoint, apiKey }: { endpoint: string; apiKey: string }) {
  const clients = {
    "Claude Code": `claude mcp add --transport http loop ${endpoint} \\\n  --header "Authorization: Bearer ${apiKey}"`,
    "Claude Desktop": JSON.stringify({ mcpServers: { loop: { command: "npx", args: ["-y", "mcp-remote", endpoint, "--header", `Authorization: Bearer ${apiKey}`] } } }, null, 2),
    Cursor: JSON.stringify({ mcpServers: { loop: { url: endpoint, headers: { Authorization: `Bearer ${apiKey}` } } } }, null, 2),
  };
  const [tab, setTab] = useState<keyof typeof clients>("Claude Code");
  const layoutId = useId();

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Set up a client</h2>
        <div className="flex h-9 rounded-[11px] bg-neutral-soft p-[3px]">
          {(Object.keys(clients) as (keyof typeof clients)[]).map((c) => (
            <button key={c} onClick={() => setTab(c)} className={cn("relative rounded-[8px] px-3 text-[13px] font-medium", tab === c ? "text-fg" : "text-muted hover:text-fg")}>
              {tab === c && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-[8px] bg-surface shadow-sm" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[13px] text-muted">
        {tab === "Claude Code" ? "Run in a terminal." : tab === "Claude Desktop" ? "Add to claude_desktop_config.json, then restart Claude." : "Add to ~/.cursor/mcp.json."}
        {apiKey.endsWith("…") && <Pill className="ml-2">Create a key to fill it in</Pill>}
      </p>
      <div className="relative">
        <pre className="overflow-x-auto rounded-xl bg-neutral-soft p-4 font-mono text-[12.5px] leading-relaxed">{clients[tab]}</pre>
        <div className="absolute top-2 right-2">
          <CopyButton value={clients[tab]} />
        </div>
      </div>
    </Card>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted shadow-sm transition-colors hover:text-fg"
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </button>
  );
}
