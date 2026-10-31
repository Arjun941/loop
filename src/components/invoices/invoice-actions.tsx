"use client";
/**
 * The buttons on an invoice. Which ones appear comes from the server (same rules it enforces).
 */
import { invoiceAction } from "@/app/(app)/invoices/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet } from "@/components/ui/sheet";
import type { InvoiceAction } from "@/lib/domain/invoice-status";
import { Loader2, Printer, Send, Wallet } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PaymentForm } from "./payment-form";
import type { PickedInvoice } from "./invoice-picker";

export function InvoiceActions({ invoice, actions, sent }: { invoice: PickedInvoice; actions: InvoiceAction[]; sent: boolean }) {
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<InvoiceAction | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  function run(action: "confirm" | "send" | "cancel", success: string) {
    setRunning(action);
    start(async () => {
      const result = await invoiceAction(invoice.id, action);
      setCancelling(false);
      if (result.ok) toast.success(success);
      else toast.error(result.error ?? "Something went wrong");
    });
  }

  const spinner = (a: InvoiceAction) => pending && running === a && <Loader2 className="size-4 animate-spin" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ButtonLink href={`/print/invoices/${invoice.id}`} target="_blank" variant="secondary">
        <Printer className="size-4" /> Print
      </ButtonLink>
      {actions.includes("cancel") && (
        <Button variant="ghost" className="text-danger" disabled={pending} onClick={() => setCancelling(true)}>
          Cancel invoice
        </Button>
      )}
      {actions.includes("send") && (
        <Button variant="secondary" disabled={pending} onClick={() => run("send", "Invoice emailed")}>
          {spinner("send") || <Send className="size-4" />} {sent ? "Send again" : "Send"}
        </Button>
      )}
      {actions.includes("confirm") && (
        <Button disabled={pending} onClick={() => run("confirm", "Invoice confirmed")}>
          {spinner("confirm")} Confirm
        </Button>
      )}
      {actions.includes("record_payment") && (
        <Button disabled={pending} onClick={() => setPaying(true)}>
          <Wallet className="size-4" /> Record payment
        </Button>
      )}

      <ConfirmDialog
        open={cancelling}
        title={`Cancel ${invoice.number}?`}
        body="The customer won't owe this amount any more. This can't be undone."
        confirmLabel="Cancel invoice"
        pending={pending}
        onConfirm={() => run("cancel", "Invoice cancelled")}
        onCancel={() => setCancelling(false)}
      />
      <Sheet open={paying} onClose={() => setPaying(false)} title="Record a payment" description={`Against ${invoice.number}`}>
        <PaymentForm invoice={invoice} onDone={() => setPaying(false)} />
      </Sheet>
    </div>
  );
}

export function RecordPaymentButton() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <Button
        onClick={() => {
          setKey((k) => k + 1);
          setOpen(true);
        }}
      >
        <Wallet className="size-4" /> Record payment
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Record a payment" description="Money received against an invoice.">
        <PaymentForm key={key} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
