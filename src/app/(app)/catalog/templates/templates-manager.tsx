"use client";

import { DeleteButton } from "@/components/catalog/archive-button";
import { ListCard, ListRow, useEditor } from "@/components/catalog/list-card";
import { RowsEditor, rowKey } from "@/components/catalog/rows-editor";
import { SheetFooter } from "@/components/catalog/sheet-footer";
import { AffixInput, Input, Select } from "@/components/form/controls";
import { Field, FormError, FormSection } from "@/components/form/field";
import { useSaveAction } from "@/components/form/use-save-action";
import { EmptyState } from "@/components/ui/page";
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { PER_PERIOD } from "@/lib/catalog-labels";
import { money } from "@/lib/format";
import type { CatalogOptions, TemplateRow } from "@/server/queries/catalog";
import { FileStack } from "lucide-react";
import { useState } from "react";
import { deleteTemplate, saveTemplate } from "../actions";

export function TemplatesManager({ templates, canEdit, options }: { templates: TemplateRow[]; canEdit: boolean; options: CatalogOptions }) {
  const editor = useEditor<TemplateRow>();

  return (
    <>
      <ListCard
        title="Quotation templates"
        description={canEdit ? "Ready-made offers with the right plan and products, so quotes start 90% done." : "View only. Ask an admin to make changes."}
        count={templates.length}
        newLabel="New template"
        onNew={canEdit ? editor.create : undefined}
      >
        {templates.length === 0 && (
          <EmptyState icon={<FileStack className="size-5" />} title="No templates yet" body="Create one for the offers you send most often." />
        )}
        {templates.map((t, i) => (
          <ListRow key={t.id} index={i} onClick={canEdit ? () => editor.edit(t) : undefined}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{t.name}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Pill tone="accent">{t.planName}</Pill>
                {t.lines.map((l) => (
                  <span key={l.id} className="rounded-md bg-neutral-soft px-2 py-0.5 text-xs text-muted">
                    {l.qty > 1 && `${l.qty} × `}
                    {l.productName}
                    {l.variantValue && ` (${l.variantValue})`}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <div>Valid {t.validityDays} days</div>
              <div>Net {t.paymentTermsDays}</div>
            </div>
          </ListRow>
        ))}
      </ListCard>

      <Sheet open={editor.open} onClose={editor.close} title={editor.item ? editor.item.name : "New quotation template"} width={600}>
        <TemplateForm key={editor.key} template={editor.item} options={options} onDone={editor.close} />
      </Sheet>
    </>
  );
}

type LineDraft = { key: string; productId: string; variantId: string; qty: string };

function TemplateForm({ template, options, onDone }: { template: TemplateRow | null; options: CatalogOptions; onDone: () => void }) {
  const { state, action, pending, errors: e, onChange } = useSaveAction(saveTemplate, { success: template ? "Template saved" : "Template created", onSuccess: onDone });
  const [planId, setPlanId] = useState(template?.planId ?? options.plans[0]?.id ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    template?.lines.map((l) => ({ key: l.id, productId: l.productId, variantId: l.variantId ?? "", qty: String(l.qty) })) ?? [
      { key: rowKey(), productId: "", variantId: "", qty: "1" },
    ],
  );
  const plan = options.plans.find((p) => p.id === planId);

  // Preview the per-period value: the plan at its minimum quantity, plus each product at its catalog price.
  const total =
    (plan ? plan.price * plan.minQty : 0) +
    lines.reduce((sum, l) => {
      const product = options.products.find((p) => p.id === l.productId);
      const variant = product?.variants.find((v) => v.id === l.variantId);
      return sum + ((product?.salesPrice ?? 0) + (variant?.extraPrice ?? 0)) * (Number(l.qty) || 0);
    }, 0);

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="id" value={template?.id ?? ""} />
      <FormError message={state.error} />

      <FormSection title="Offer">
        <Field label="Name" error={e.name}>
          <Input name="name" defaultValue={template?.name} placeholder="e.g. Enterprise rollout" autoFocus={!template} invalid={!!e.name} />
        </Field>
        <Field label="Plan" error={e.planId}>
          <Select name="planId" value={planId} onChange={(ev) => setPlanId(ev.target.value)} invalid={!!e.planId}>
            {options.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {money(p.price, { whole: true })}/{PER_PERIOD[p.period]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quote valid for" error={e.validityDays}>
            <AffixInput name="validityDays" type="number" min={1} suffix="days" defaultValue={template?.validityDays ?? 30} invalid={!!e.validityDays} className="pr-14" />
          </Field>
          <Field label="Payment terms" error={e.paymentTermsDays}>
            <AffixInput name="paymentTermsDays" type="number" min={0} suffix="days" defaultValue={template?.paymentTermsDays ?? 15} invalid={!!e.paymentTermsDays} className="pr-14" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Products">
        <RowsEditor
          name="lines"
          rows={lines}
          onChange={setLines}
          blank={() => ({ key: rowKey(), productId: "", variantId: "", qty: "1" })}
          serialize={(rows) => rows.map((r) => ({ productId: r.productId, variantId: r.variantId || null, qty: r.qty }))}
          addLabel="Add product"
          renderRow={(row, update) => {
            const product = options.products.find((p) => p.id === row.productId);
            return (
              <div className="grid grid-cols-[1fr_88px] gap-2">
                <div className="flex flex-col gap-2">
                  <Select aria-label="Product" value={row.productId} onChange={(ev) => update({ productId: ev.target.value, variantId: "" })}>
                    <option value="">Choose a product…</option>
                    {options.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {money(p.salesPrice, { whole: true })}
                      </option>
                    ))}
                  </Select>
                  {product && product.variants.length > 0 && (
                    <Select aria-label="Variant" value={row.variantId} onChange={(ev) => update({ variantId: ev.target.value })}>
                      <option value="">No variant</option>
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.attribute}: {v.value} {v.extraPrice > 0 && `(+${money(v.extraPrice, { whole: true })})`}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <Input aria-label="Quantity" type="number" min={1} value={row.qty} onChange={(ev) => update({ qty: ev.target.value })} />
              </div>
            );
          }}
        />
        {e.lines && <p className="text-[13px] text-danger">{e.lines === "Invalid input" ? "Choose a product for every line." : e.lines}</p>}
        {plan && (
          <div className="flex items-baseline justify-between rounded-xl bg-neutral-soft px-4 py-3">
            <span className="text-[13px] text-muted">Plan{plan.minQty > 1 && ` × ${plan.minQty}`} + products, before tax</span>
            <span className="text-[15px] font-semibold tabular">
              {money(total)} <span className="font-normal text-muted">/ {PER_PERIOD[plan.period]}</span>
            </span>
          </div>
        )}
      </FormSection>

      <SheetFooter pending={pending} saveLabel={template ? "Save changes" : "Create template"}>
        {template && <DeleteButton noun="Template" onDelete={() => deleteTemplate(template.id)} onDone={onDone} />}
      </SheetFooter>
    </form>
  );
}
