"use client";
/**
 * Archive / restore with an Undo toast. Archiving hides an item from new subscriptions
 * but keeps it on existing ones, so it's always reversible.
 */
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validation/auth";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export function ArchiveButton({
  noun,
  active,
  setActive,
  onDone,
}: {
  noun: string;
  active: boolean;
  setActive: (active: boolean) => Promise<FormState>;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();

  function run(next: boolean) {
    start(async () => {
      const result = await setActive(next);
      if (!result.ok) return void toast.error(result.error ?? "Something went wrong");
      onDone();
      toast.success(next ? `${noun} restored` : `${noun} archived`, {
        action: { label: "Undo", onClick: () => void setActive(!next) },
      });
    });
  }

  return (
    <Button type="button" variant={active ? "ghost" : "secondary"} disabled={pending} onClick={() => run(!active)} className="h-11 rounded-xl">
      {active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
      {active ? "Archive" : "Restore"}
    </Button>
  );
}

export function DeleteButton({ noun, onDelete, onDone }: { noun: string; onDelete: () => Promise<FormState>; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      className="h-11 rounded-xl"
      onClick={() =>
        start(async () => {
          const result = await onDelete();
          if (!result.ok) return void toast.error(result.error ?? "Something went wrong");
          onDone();
          toast.success(`${noun} deleted`);
        })
      }
    >
      <Trash2 className="size-4" /> Delete
    </Button>
  );
}
