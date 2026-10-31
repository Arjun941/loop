"use client";

import { ArchiveButton } from "@/components/catalog/archive-button";
import { ListCard, ListRow, useEditor } from "@/components/catalog/list-card";
import { SheetFooter } from "@/components/catalog/sheet-footer";
import { AffixInput, Input, Segmented, Switch } from "@/components/form/controls";
import { Field, FormError, FormSection } from "@/components/form/field";
import { useSaveAction } from "@/components/form/use-save-action";
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { PER_PERIOD, toRupeeInput } from "@/lib/catalog-labels";
import { formatDate, money, number } from "@/lib/format";
import type { PlanRow } from "@/server/queries/catalog";
import { useState } from "react";
import { savePlan, setPlanActive } from "../actions";

export function PlansManager({ plans, canEdit }: { plans: PlanRow[]; canEdit: boolean }) {
  const editor = useEditor<PlanRow>();

  return (
    <>
      <ListCard
        title="Plans"
        description={canEdit ? "How much a subscription costs and how often it bills." : "View only. Ask an admin to make changes."}
        count={plans.length}
        newLabel="New plan"
        onNew={canEdit ? editor.create : undefined}
      >
        {plans.map((p, i) => (
          <ListRow key={p.id} index={i} muted={!p.active} onClick={canEdit ? () => editor.edit(p) : undefined}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-medium">{p.name}</span>
                {!p.active && <Pill tone="warning">Archived</Pill>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <span>{number(p.activeSubs)} active</span>
                {p.minQty > 1 && <Pill>Min {p.minQty}</Pill>}
                {p.autoClose && <Pill>Auto-close</Pill>}
                {p.pausable && <Pill>Pausable</Pill>}
                {p.renewable && <Pill>Renewable</Pill>}
                {p.endsOn && <Pill tone="accent">Until {formatDate(p.endsOn, { short: true })}</Pill>}
              </div>
            </div>
            <div className="text-right text-[15px] font-medium tabular">
              {money(p.price, { whole: true })}
              <span className="font-normal text-muted"> / {PER_PERIOD[p.period]}</span>
            </div>
          </ListRow>
        ))}
      </ListCard>

      <Sheet
        open={editor.open}
        onClose={editor.close}
        title={editor.item ? editor.item.name : "New plan"}
        description={editor.item?.activeSubs ? `${number(editor.item.activeSubs)} active subscriptions use this plan.` : undefined}
        width={540}
      >
        <PlanForm key={editor.key} plan={editor.item} onDone={editor.close} />
      </Sheet>
    </>
  );
}

function PlanForm({ plan, onDone }: { plan: PlanRow | null; onDone: () => void }) {
  const { state, action, pending, errors: e, onChange } = useSaveAction(savePlan, { success: plan ? "Plan saved" : "Plan created", onSuccess: onDone });
  const [period, setPeriod] = useState(plan?.period ?? "monthly");
  const [flags, setFlags] = useState({
    autoClose: plan?.autoClose ?? false,
    closable: plan?.closable ?? true,
    pausable: plan?.pausable ?? false,
    renewable: plan?.renewable ?? true,
  });
  const flag = (key: keyof typeof flags) => (value: boolean) => setFlags((f) => ({ ...f, [key]: value }));

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="id" value={plan?.id ?? ""} />
      <FormError message={state.error} />

      <FormSection title="Pricing">
        <Field label="Name" error={e.name}>
          <Input name="name" defaultValue={plan?.name} placeholder="e.g. Growth Monthly" autoFocus={!plan} invalid={!!e.name} />
        </Field>
        <Field label="Bills every">
          <Segmented
            name="period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "daily", label: "Day" },
              { value: "weekly", label: "Week" },
              { value: "monthly", label: "Month" },
              { value: "yearly", label: "Year" },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Price per ${PER_PERIOD[period]}`} error={e.price}>
            <AffixInput name="price" prefix="₹" inputMode="decimal" defaultValue={toRupeeInput(plan?.price)} invalid={!!e.price} />
          </Field>
          <Field label="Minimum quantity" error={e.minQty}>
            <Input name="minQty" type="number" min={1} defaultValue={plan?.minQty ?? 1} invalid={!!e.minQty} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Availability">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Available from" error={e.startsOn}>
            <Input name="startsOn" type="date" defaultValue={plan?.startsOn ?? ""} invalid={!!e.startsOn} />
          </Field>
          <Field label="Available until" hint="Leave empty for no end" error={e.endsOn}>
            <Input name="endsOn" type="date" defaultValue={plan?.endsOn ?? ""} invalid={!!e.endsOn} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Lifecycle">
        <div className="divide-y divide-line rounded-xl border border-field-border px-4">
          <Switch name="autoClose" checked={flags.autoClose} onChange={flag("autoClose")} label="Close automatically" description="Subscriptions close on their own when they expire." />
          <Switch name="closable" checked={flags.closable} onChange={flag("closable")} label="Can be closed early" description="Staff or customers may end it before expiry." />
          <Switch name="pausable" checked={flags.pausable} onChange={flag("pausable")} label="Can be paused" description="Billing stops while paused, then resumes." />
          <Switch name="renewable" checked={flags.renewable} onChange={flag("renewable")} label="Can be renewed" description="Extend for another term when it expires." />
        </div>
      </FormSection>

      <SheetFooter pending={pending} saveLabel={plan ? "Save changes" : "Create plan"}>
        {plan && <ArchiveButton noun="Plan" active={plan.active} setActive={(a) => setPlanActive(plan.id, a)} onDone={onDone} />}
      </SheetFooter>
    </form>
  );
}
