"use client";
/**
 * The lifecycle buttons on a subscription. The server decides which actions are available
 * (via the same `checkAction` rules); this just presents them: the next step as the primary
 * button, the rest as quieter ones, and a confirmation for anything that ends the subscription.
 */
import { subscriptionAction } from "@/app/(app)/subscriptions/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTIONS, type SubscriptionAction } from "@/lib/domain/subscription-status";
import { Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const PRIMARY: SubscriptionAction[] = ["send_quote", "confirm", "activate", "resume"];
const DESTRUCTIVE: SubscriptionAction[] = ["close", "discard"];

const SUCCESS: Record<SubscriptionAction, string> = {
  send_quote: "Quotation sent",
  revise: "Moved back to draft",
  confirm: "Marked as accepted",
  activate: "Subscription is active",
  pause: "Subscription paused",
  resume: "Subscription resumed",
  renew: "Subscription renewed",
  close: "Subscription closed",
  discard: "Quote discarded",
};

export function SubscriptionActions({ id, number, actions, editable }: { id: string; number: string; actions: SubscriptionAction[]; editable: boolean }) {
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<SubscriptionAction | null>(null);
  const [confirming, setConfirming] = useState<SubscriptionAction | null>(null);

  function run(action: SubscriptionAction) {
    setRunning(action);
    start(async () => {
      const result = await subscriptionAction(id, action);
      setConfirming(null);
      if (result.ok) toast.success(SUCCESS[action]);
      else toast.error(result.error ?? "Something went wrong");
    });
  }

  const primary = actions.find((a) => PRIMARY.includes(a));
  const others = actions.filter((a) => a !== primary);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {editable && (
        <ButtonLink href={`/subscriptions/${id}/edit`} variant="secondary">
          <Pencil className="size-3.5" /> Edit
        </ButtonLink>
      )}
      {others.map((a) => (
        <Button
          key={a}
          variant={DESTRUCTIVE.includes(a) ? "ghost" : "secondary"}
          disabled={pending}
          className={DESTRUCTIVE.includes(a) ? "text-danger" : undefined}
          onClick={() => (DESTRUCTIVE.includes(a) ? setConfirming(a) : run(a))}
        >
          {pending && running === a && <Loader2 className="size-4 animate-spin" />}
          {ACTIONS[a].label}
        </Button>
      ))}
      {primary && (
        <Button disabled={pending} onClick={() => run(primary)}>
          {pending && running === primary && <Loader2 className="size-4 animate-spin" />}
          {ACTIONS[primary].label}
        </Button>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title={confirming === "discard" ? `Discard ${number}?` : `Close ${number}?`}
        body={confirming === "discard" ? "The quote will be closed and can't be sent again." : "Billing stops and no further invoices will be created. This can't be undone."}
        confirmLabel={confirming === "discard" ? "Discard" : "Close subscription"}
        pending={pending}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
