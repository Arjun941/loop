"use client";

import { ArchiveButton } from "@/components/catalog/archive-button";
import { ListCard, ListRow, useEditor } from "@/components/catalog/list-card";
import { SheetFooter } from "@/components/catalog/sheet-footer";
import { AffixInput, ChipPicker, Input, Segmented } from "@/components/form/controls";
import { Field, FormError, FormSection } from "@/components/form/field";
import { useSaveAction } from "@/components/form/use-save-action";
import { EmptyState } from "@/components/ui/page";
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { toRupeeInput } from "@/lib/catalog-labels";
import { today } from "@/lib/dates";
import { formatDate, money, number } from "@/lib/format";
import type { CatalogOptions, DiscountRow } from "@/server/queries/catalog";
import { BadgePercent } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { saveDiscount, setDiscountActive } from "../actions";

export function DiscountsManager({ discounts, canEdit, products }: { discounts: DiscountRow[]; canEdit: boolean; products: CatalogOptions["products"] }) {
  const editor = useEditor<DiscountRow>();

  return (
    <>
      <ListCard
        title="Discounts"
        description={canEdit ? "Applied to the next invoice automatically, and stopped when they expire or run out." : "Only an admin can create discounts."}
        count={discounts.length}
        newLabel="New discount"
        onNew={canEdit ? editor.create : undefined}
      >
        {discounts.length === 0 && <EmptyState icon={<BadgePercent className="size-5" />} title="No discounts yet" body="Create one to reward bigger or longer commitments." />}
        {discounts.map((d, i) => {
          const status = discountStatus(d);
          return (
            <ListRow key={d.id} index={i} muted={status.tone === "neutral"} onClick={canEdit ? () => editor.edit(d) : undefined}>
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-[13px] font-semibold text-accent tabular">
                {d.kind === "percent" ? `${d.value / 100}%` : "₹"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-medium">{d.name}</span>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </div>
                <div className="mt-1 text-xs text-muted">{describe(d)}</div>
              </div>
              {d.usageLimit && <Usage used={d.timesUsed} limit={d.usageLimit} />}
            </ListRow>
          );
        })}
      </ListCard>

      <Sheet open={editor.open} onClose={editor.close} title={editor.item ? editor.item.name : "New discount"} width={560}>
        <DiscountForm key={editor.key} discount={editor.item} products={products} onDone={editor.close} />
      </Sheet>
    </>
  );
}

function discountStatus(d: DiscountRow): { label: string; tone: "success" | "neutral" | "warning" | "accent" } {
  const now = today();
  if (!d.active) return { label: "Archived", tone: "neutral" };
  if (d.endsOn && d.endsOn < now) return { label: "Expired", tone: "neutral" };
  if (d.usageLimit && d.timesUsed >= d.usageLimit) return { label: "Used up", tone: "neutral" };
  if (d.startsOn && d.startsOn > now) return { label: "Scheduled", tone: "accent" };
  return { label: "Live", tone: "success" };
}

function describe(d: DiscountRow) {
  const parts = [d.kind === "percent" ? `${d.value / 100}% off` : `${money(d.value, { whole: true })} off`];
  parts.push(d.scope === "products" ? `${d.productIds.length} product${d.productIds.length === 1 ? "" : "s"}` : "whole subscription");
  if (d.minQty) parts.push(`${d.minQty}+ units`);
  if (d.minAmount) parts.push(`over ${money(d.minAmount, { whole: true })}`);
  if (d.endsOn) parts.push(`until ${formatDate(d.endsOn, { short: true })}`);
  return parts.join(" · ");
}

function Usage({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="hidden w-28 sm:block">
      <div className="mb-1 text-right text-xs text-muted tabular">
        {number(used)} / {number(limit)} used
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-soft">
        <motion.div className={pct >= 100 ? "h-full bg-subtle" : "h-full bg-accent"} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

function DiscountForm({ discount, products, onDone }: { discount: DiscountRow | null; products: CatalogOptions["products"]; onDone: () => void }) {
  const { state, action, pending, errors: e, onChange } = useSaveAction(saveDiscount, { success: discount ? "Discount saved" : "Discount created", onSuccess: onDone });
  const [kind, setKind] = useState(discount?.kind ?? "percent");
  const [scope, setScope] = useState(discount?.scope ?? "subscription");
  const [productIds, setProductIds] = useState<string[]>(discount?.productIds ?? []);
  const initialValue = discount ? (discount.kind === "percent" ? String(discount.value / 100) : toRupeeInput(discount.value)) : "";

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="id" value={discount?.id ?? ""} />
      <FormError message={state.error} />

      <FormSection title="Discount">
        <Field label="Name" error={e.name}>
          <Input name="name" defaultValue={discount?.name} placeholder="e.g. 10% off for 10+ seats" autoFocus={!discount} invalid={!!e.name} />
        </Field>
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <Field label="Type">
            <Segmented
              name="kind"
              value={kind}
              onChange={setKind}
              options={[
                { value: "percent", label: "Percent" },
                { value: "fixed", label: "Fixed" },
              ]}
            />
          </Field>
          <Field label="Amount" error={e.value}>
            <AffixInput
              key={kind}
              name="value"
              inputMode="decimal"
              prefix={kind === "fixed" ? "₹" : undefined}
              suffix={kind === "percent" ? "%" : undefined}
              defaultValue={discount?.kind === kind ? initialValue : ""}
              invalid={!!e.value}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Applies to">
        <Segmented
          name="scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: "subscription", label: "Whole subscription" },
            { value: "products", label: "Specific products" },
          ]}
        />
        {scope === "products" ? (
          <Field label="Products" error={e.productIds}>
            <ChipPicker name="productIds" options={products.map((p) => ({ value: p.id, label: p.name }))} value={productIds} onChange={setProductIds} />
          </Field>
        ) : (
          <input type="hidden" name="productIds" value="[]" />
        )}
      </FormSection>

      <FormSection title="Conditions">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum purchase" hint="Optional" error={e.minAmount}>
            <AffixInput name="minAmount" prefix="₹" inputMode="decimal" defaultValue={toRupeeInput(discount?.minAmount)} invalid={!!e.minAmount} />
          </Field>
          <Field label="Minimum quantity" hint="Optional" error={e.minQty}>
            <Input name="minQty" type="number" min={1} defaultValue={discount?.minQty ?? ""} invalid={!!e.minQty} />
          </Field>
          <Field label="Starts" error={e.startsOn}>
            <Input name="startsOn" type="date" defaultValue={discount?.startsOn ?? today()} invalid={!!e.startsOn} />
          </Field>
          <Field label="Ends" hint="Optional" error={e.endsOn}>
            <Input name="endsOn" type="date" defaultValue={discount?.endsOn ?? ""} invalid={!!e.endsOn} />
          </Field>
        </div>
        <Field label="Usage limit" hint={discount ? `Used ${number(discount.timesUsed)} times so far. Leave empty for unlimited.` : "How many invoices it can apply to. Leave empty for unlimited."} error={e.usageLimit}>
          <AffixInput name="usageLimit" type="number" min={1} suffix="uses" defaultValue={discount?.usageLimit ?? ""} invalid={!!e.usageLimit} className="pr-14" />
        </Field>
      </FormSection>

      <SheetFooter pending={pending} saveLabel={discount ? "Save changes" : "Create discount"}>
        {discount && <ArchiveButton noun="Discount" active={discount.active} setActive={(a) => setDiscountActive(discount.id, a)} onDone={onDone} />}
      </SheetFooter>
    </form>
  );
}
