"use client";

import { ArchiveButton } from "@/components/catalog/archive-button";
import { ListCard, ListRow, useEditor } from "@/components/catalog/list-card";
import { SheetFooter } from "@/components/catalog/sheet-footer";
import { AffixInput, Input, Segmented, Select } from "@/components/form/controls";
import { Field, FormError, FormSection } from "@/components/form/field";
import { useSaveAction } from "@/components/form/use-save-action";
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { PRODUCT_TYPE_LABEL } from "@/lib/catalog-labels";
import type { CatalogOptions, TaxRow } from "@/server/queries/catalog";
import { useState } from "react";
import { saveTax, setTaxActive } from "../actions";

export function TaxesManager({ taxes, canEdit, products }: { taxes: TaxRow[]; canEdit: boolean; products: CatalogOptions["products"] }) {
  const editor = useEditor<TaxRow>();

  return (
    <>
      <ListCard
        title="Taxes"
        description={canEdit ? "Rules applied automatically to every invoice line they match." : "View only. Ask an admin to make changes."}
        count={taxes.length}
        newLabel="New tax"
        onNew={canEdit ? editor.create : undefined}
      >
        {taxes.map((t, i) => (
          <ListRow key={t.id} index={i} muted={!t.active} onClick={canEdit ? () => editor.edit(t) : undefined}>
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-soft text-[13px] font-semibold tabular">{t.rateBps / 100}%</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-medium">{t.name}</span>
                {!t.active && <Pill tone="warning">Archived</Pill>}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {t.scope === "all" ? "Applies to everything" : t.scope === "product_type" ? `Applies to ${PRODUCT_TYPE_LABEL[t.productType!].toLowerCase()} products` : `Applies to ${t.productName}`}
              </div>
            </div>
          </ListRow>
        ))}
      </ListCard>

      <Sheet open={editor.open} onClose={editor.close} title={editor.item ? editor.item.name : "New tax"} width={500}>
        <TaxForm key={editor.key} tax={editor.item} products={products} onDone={editor.close} />
      </Sheet>
    </>
  );
}

function TaxForm({ tax, products, onDone }: { tax: TaxRow | null; products: CatalogOptions["products"]; onDone: () => void }) {
  const { state, action, pending, errors: e, onChange } = useSaveAction(saveTax, { success: tax ? "Tax saved" : "Tax created", onSuccess: onDone });
  const [scope, setScope] = useState(tax?.scope ?? "all");

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="id" value={tax?.id ?? ""} />
      <FormError message={state.error} />

      <FormSection title="Rate">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <Field label="Name" error={e.name}>
            <Input name="name" defaultValue={tax?.name} placeholder="e.g. GST 18%" autoFocus={!tax} invalid={!!e.name} />
          </Field>
          <Field label="Rate" error={e.rate}>
            <AffixInput name="rate" inputMode="decimal" suffix="%" defaultValue={tax ? String(tax.rateBps / 100) : ""} invalid={!!e.rate} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Applies to">
        <Segmented
          name="scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: "Everything" },
            { value: "product_type", label: "A product type" },
            { value: "product", label: "One product" },
          ]}
        />
        {scope === "product_type" && (
          <Field label="Product type" error={e.productType}>
            <Select name="productType" defaultValue={tax?.productType ?? "service"} invalid={!!e.productType}>
              {Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {scope === "product" && (
          <Field label="Product" error={e.productId}>
            <Select name="productId" defaultValue={tax?.productId ?? ""} invalid={!!e.productId}>
              <option value="">Choose a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </FormSection>

      <SheetFooter pending={pending} saveLabel={tax ? "Save changes" : "Create tax"}>
        {tax && <ArchiveButton noun="Tax" active={tax.active} setActive={(a) => setTaxActive(tax.id, a)} onDone={onDone} />}
      </SheetFooter>
    </form>
  );
}
