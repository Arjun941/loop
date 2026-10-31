/**
 * Bottom bar of an editor sheet: secondary actions on the left, Save on the right.
 */
import { SubmitButton } from "@/components/form/field";
import type { ReactNode } from "react";

export function SheetFooter({ pending, saveLabel, children }: { pending: boolean; saveLabel: string; children?: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-8 flex items-center gap-2 border-t border-line bg-surface px-6 py-4">
      {children}
      <SubmitButton pending={pending} className="ml-auto w-auto px-6">
        {saveLabel}
      </SubmitButton>
    </div>
  );
}
