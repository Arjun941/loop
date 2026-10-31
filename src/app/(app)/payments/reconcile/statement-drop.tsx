"use client";
/**
 * Drop zone for a bank statement CSV, plus a sample statement for trying it out.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileSpreadsheet, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { importSampleAction, importStatementAction } from "./actions";

export function StatementDrop() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();

  function handle(result: { importId: string } | { error: string }) {
    if ("error" in result) toast.error(result.error);
    else router.push(`/payments/reconcile?import=${result.importId}`);
  }

  function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) return void toast.error("Choose a .csv file exported from your bank.");
    if (file.size > 2_000_000) return void toast.error("That file is too large (2 MB max).");
    start(async () => handle(await importStatementAction(file.name, await file.text())));
  }

  return (
    <Card className="p-2">
      <motion.button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) upload(file);
        }}
        animate={{ scale: dragging ? 1.01 : 1 }}
        disabled={pending}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-16 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-hover",
        )}
      >
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          {pending ? <Loader2 className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
        </div>
        <div className="text-[17px] font-semibold tracking-tight">{pending ? "Matching payments…" : "Drop a bank statement here"}</div>
        <div className="mt-1 max-w-sm text-sm text-muted">
          CSV with date, amount and description columns. Every bank&apos;s export works: headers like Narration, Credit or Value Date are recognised.
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent">
          <FileSpreadsheet className="size-4" /> Choose a file
        </span>
      </motion.button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-2 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted">No statement handy? Try one built from your current open invoices.</p>
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => handle(await importSampleAction()))} className="border border-field-border shadow-none">
          <Sparkles className="size-4" /> Try a sample statement
        </Button>
      </div>
    </Card>
  );
}
