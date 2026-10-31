"use client";
/**
 * useActionState plus the usual form behaviour:
 * - a toast and a callback (e.g. close the sheet) on success, done inside the action to avoid an extra render;
 * - field errors that disappear as soon as the user edits that field.
 *
 * Attach `onChange` to the <form>: change events bubble up with the edited input's name.
 * Controls without their own name (e.g. rows inside a list editor) sit in an element with
 * `data-field="<name>"`, which tells this hook which field they belong to.
 */
import type { FormState } from "@/lib/validation/auth";
import { useActionState, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function useSaveAction(
  action: (prev: FormState, form: FormData) => Promise<FormState>,
  { success, onSuccess }: { success: string; onSuccess?: () => void },
) {
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await action(prev, form);
    setEdited(new Set());
    if (result.ok) {
      toast.success(success);
      onSuccess?.();
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, {});

  const errors: Partial<Record<string, string>> = {};
  for (const [field, message] of Object.entries(state.fieldErrors ?? {})) {
    if (!edited.has(field)) errors[field] = message;
  }

  function onChange(e: FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLElement;
    const name = (target as HTMLInputElement).name || target.closest<HTMLElement>("[data-field]")?.dataset.field;
    if (name && state.fieldErrors?.[name] && !edited.has(name)) setEdited((s) => new Set(s).add(name));
  }

  return { state, action: formAction, pending, errors, onChange };
}
