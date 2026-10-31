"use client";

import { ArchiveButton } from "@/components/catalog/archive-button";
import { ListCard, ListRow, useEditor } from "@/components/catalog/list-card";
import { RowsEditor, rowKey } from "@/components/catalog/rows-editor";
import { SheetFooter } from "@/components/catalog/sheet-footer";
import { AffixInput, Input, Segmented, Textarea } from "@/components/form/controls";
import { Field, FormError, FormSection } from "@/components/form/field";
import { useSaveAction } from "@/components/form/use-save-action";
import { Sheet } from "@/components/ui/sheet";
import { Pill } from "@/components/ui/status";
import { PRODUCT_TYPE_LABEL, toRupeeInput } from "@/lib/catalog-labels";
import { money } from "@/lib/format";
import type { ProductRow } from "@/server/queries/catalog";
import { useState } from "react";
import { saveProduct, setProductActive } from "../actions";

export function ProductsManager({ products, canEdit }: { products: ProductRow[]; canEdit: boolean }) {
  const editor = useEditor<ProductRow>();

  return (
    <>
      <ListCard
        title="Products"
        description={canEdit ? "Everything you can put on a subscription." : "View only. Ask an admin to make changes."}
        count={products.length}
        newLabel="New product"
        onNew={canEdit ? editor.create : undefined}
      >
        {products.map((p, i) => (
          <ListRow key={p.id} index={i} muted={!p.active} onClick={canEdit ? () => editor.edit(p) : undefined}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-medium">{p.name}</span>
                <Pill>{PRODUCT_TYPE_LABEL[p.type]}</Pill>
                {!p.active && <Pill tone="warning">Archived</Pill>}
              </div>
              {p.variants.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.variants.map((v) => (
                    <span key={v.id} className="rounded-md bg-neutral-soft px-2 py-0.5 text-xs text-muted">
                      {v.value}
                      {v.extraPrice > 0 && <span className="text-fg"> +{money(v.extraPrice, { whole: true })}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[15px] font-medium tabular">{money(p.salesPrice)}</div>
              <div className="text-xs text-muted tabular">{margin(p.salesPrice, p.costPrice)} margin</div>
            </div>
          </ListRow>
        ))}
      </ListCard>

      <Sheet
        open={editor.open}
        onClose={editor.close}
        title={editor.item ? editor.item.name : "New product"}
        description={editor.item?.inUse ? `On ${editor.item.inUse} subscriptions. Price changes apply to new subscriptions.` : undefined}
        width={560}
      >
        <ProductForm key={editor.key} product={editor.item} onDone={editor.close} />
      </Sheet>
    </>
  );
}

function margin(sales: number, cost: number) {
  if (sales <= 0) return "—";
  return `${Math.round(((sales - cost) / sales) * 100)}%`;
}

type VariantDraft = { key: string; id?: string; attribute: string; value: string; extraPrice: string };

function ProductForm({ product, onDone }: { product: ProductRow | null; onDone: () => void }) {
  const { state, action, pending, errors: e, onChange } = useSaveAction(saveProduct, { success: product ? "Product saved" : "Product created", onSuccess: onDone });
  const [type, setType] = useState(product?.type ?? "service");
  const [prices, setPrices] = useState({ sales: toRupeeInput(product?.salesPrice), cost: toRupeeInput(product?.costPrice ?? 0) });
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.map((v) => ({ key: v.id, id: v.id, attribute: v.attribute, value: v.value, extraPrice: toRupeeInput(v.extraPrice) })) ?? [],
  );
  const sales = Number(prices.sales) || 0;
  const cost = Number(prices.cost) || 0;

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-7" noValidate>
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <FormError message={state.error} />

      <FormSection title="Details">
        <Field label="Name" error={e.name}>
          <Input name="name" defaultValue={product?.name} placeholder="e.g. ERP Connector" autoFocus={!product} invalid={!!e.name} />
        </Field>
        <Field label="Type">
          <Segmented
            name="type"
            value={type}
            onChange={setType}
            options={[
              { value: "service", label: "Service" },
              { value: "goods", label: "Goods" },
              { value: "addon", label: "Add-on" },
            ]}
          />
        </Field>
      </FormSection>

      <FormSection title="Pricing">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sales price" error={e.salesPrice}>
            <AffixInput name="salesPrice" prefix="₹" inputMode="decimal" value={prices.sales} onChange={(ev) => setPrices((p) => ({ ...p, sales: ev.target.value }))} invalid={!!e.salesPrice} />
          </Field>
          <Field label="Cost price" error={e.costPrice}>
            <AffixInput name="costPrice" prefix="₹" inputMode="decimal" value={prices.cost} onChange={(ev) => setPrices((p) => ({ ...p, cost: ev.target.value }))} invalid={!!e.costPrice} />
          </Field>
        </div>
        {sales > 0 && (
          <p className="-mt-1 text-[13px] text-muted">
            {money(Math.round((sales - cost) * 100))} profit per unit · <span className="text-fg">{margin(sales, cost)} margin</span>
          </p>
        )}
      </FormSection>

      <FormSection title="Variants">
        <p className="-mt-2 text-[13px] text-muted">Options that change the price, e.g. Brand: Odoo adds ₹560.</p>
        <RowsEditor<VariantDraft>
          name="variants"
          rows={variants}
          onChange={setVariants}
          blank={() => ({ key: rowKey(), attribute: variants.at(-1)?.attribute ?? "", value: "", extraPrice: "0" })}
          serialize={(rows) => rows.map((r) => ({ id: r.id, attribute: r.attribute, value: r.value, extraPrice: r.extraPrice }))}
          addLabel="Add variant"
          renderRow={(row, update) => (
            <div className="grid grid-cols-[1fr_1fr_120px] gap-2">
              <Input aria-label="Attribute" placeholder="Brand" value={row.attribute} onChange={(ev) => update({ attribute: ev.target.value })} />
              <Input aria-label="Value" placeholder="Odoo" value={row.value} onChange={(ev) => update({ value: ev.target.value })} />
              <AffixInput aria-label="Extra price" prefix="+₹" inputMode="decimal" value={row.extraPrice} onChange={(ev) => update({ extraPrice: ev.target.value })} className="pl-10" />
            </div>
          )}
        />
        {e.variants && <p className="text-[13px] text-danger">Every variant needs an attribute and a value.</p>}
      </FormSection>

      <FormSection title="Notes">
        <Textarea name="notes" defaultValue={product?.notes ?? ""} placeholder="Internal notes (optional)" />
      </FormSection>

      <SheetFooter pending={pending} saveLabel={product ? "Save changes" : "Create product"}>
        {product && <ArchiveButton noun="Product" active={product.active} setActive={(a) => setProductActive(product.id, a)} onDone={onDone} />}
      </SheetFooter>
    </form>
  );
}
