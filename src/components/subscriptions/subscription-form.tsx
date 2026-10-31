"use client";
/**
 * Create or edit a subscription quote.
 *
 * Start from a quotation template (plan, products and terms filled in) or from scratch.
 * The summary on the right reprices on every change with the same `priceLines` the server uses,
 * so the total shown is the total that will be billed.
 */
import { saveSubscriptionAction } from "@/app/(app)/subscriptions/actions";
import { RowsEditor, rowKey } from "@/components/catalog/rows-editor";
import { AffixInput, Input, Select } from "@/components/form/controls";
import { Field, FormError, FormSection } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PER_PERIOD } from "@/lib/catalog-labels";
import { addDays, monthlyFactor, today } from "@/lib/dates";
import { priceLines, type PricingLine } from "@/lib/domain/pricing";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/validation/auth";
import type { SubscriptionFormData } from "@/server/queries/subscriptions";
import { FilePlus2, FileStack, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useMemo, useState } from "react";
import { CustomerPicker, type PickedCustomer } from "./customer-picker";

type LineDraft = { key: string; productId: string; variantId: string; qty: string };

export type SubscriptionFormInitial = {
  id: string;
  customer: PickedCustomer;
  planId: string;
  planQty: number;
  startDate: string;
  expiryDate: string | null;
  quoteValidUntil: string | null;
  paymentTermsDays: number;
  discountId: string | null;
  lines: { productId: string; variantId: string | null; qty: number }[];
};

export function SubscriptionForm({ data, initial }: { data: SubscriptionFormData; initial?: SubscriptionFormInitial }) {
  const firstPlan = data.plans[0];
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(initial?.customer ?? null);
  const [planId, setPlanId] = useState(initial?.planId ?? firstPlan?.id ?? "");
  const [planQty, setPlanQty] = useState(String(initial?.planQty ?? firstPlan?.minQty ?? 1));
  const [startDate, setStartDate] = useState(initial?.startDate ?? today());
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? "");
  const [quoteValidUntil, setQuoteValidUntil] = useState(initial?.quoteValidUntil ?? addDays(today(), 30));
  const [terms, setTerms] = useState(String(initial?.paymentTermsDays ?? 15));
  const [discountId, setDiscountId] = useState(initial?.discountId ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines.map((l) => ({ key: rowKey(), productId: l.productId, variantId: l.variantId ?? "", qty: String(l.qty) })) ?? [],
  );
  // Only drives which button shows a spinner; the submitted intent comes from the clicked button.
  const [intent, setIntent] = useState<"draft" | "quote">("draft");
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await saveSubscriptionAction(prev, form);
    setEdited(new Set());
    return result;
  }, {});

  const plan = data.plans.find((p) => p.id === planId);
  const errors = Object.fromEntries(Object.entries(state.fieldErrors ?? {}).filter(([k]) => !edited.has(k)));
  const touch = (field: string) => setEdited((s) => (s.has(field) ? s : new Set(s).add(field)));

  function applyTemplate(id: string | null) {
    setTemplateId(id);
    const t = data.templates.find((x) => x.id === id);
    if (!t) return;
    const p = data.plans.find((x) => x.id === t.planId);
    setPlanId(t.planId);
    setPlanQty(String(p?.minQty ?? 1));
    setTerms(String(t.paymentTermsDays));
    setQuoteValidUntil(addDays(today(), t.validityDays));
    setLines(t.lines.map((l) => ({ key: rowKey(), productId: l.productId, variantId: l.variantId ?? "", qty: String(l.qty) })));
  }

  // Live preview, priced exactly as the server will.
  const preview = useMemo(() => {
    if (!plan) return null;
    const pricing: PricingLine[] = [
      { productId: null, productType: "service", description: plan.name, qty: Number(planQty) || 0, unitPrice: plan.price },
      ...lines.flatMap((l) => {
        const product = data.products.find((p) => p.id === l.productId);
        if (!product) return [];
        const variant = product.variants.find((v) => v.id === l.variantId);
        return [
          {
            productId: product.id,
            productType: product.type,
            description: variant ? `${product.name} (${variant.value})` : product.name,
            qty: Number(l.qty) || 0,
            unitPrice: product.salesPrice + (variant?.extraPrice ?? 0),
          },
        ];
      }),
    ];
    const discount = data.discounts.find((d) => d.id === discountId) ?? null;
    const result = priceLines(pricing, { taxes: data.taxes, discount, onDate: startDate || today() });
    return { ...result, mrr: Math.round((result.subtotal - result.discountTotal) * monthlyFactor(plan.period)) };
  }, [plan, planQty, lines, discountId, startDate, data]);

  return (
    <form
      action={action}
      onChange={(e) => {
        const target = e.target as HTMLElement;
        const name = (target as HTMLInputElement).name || target.closest<HTMLElement>("[data-field]")?.dataset.field;
        if (name) touch(name);
      }}
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      noValidate
    >
      <input type="hidden" name="id" value={initial?.id ?? ""} />

      <div className="flex flex-col gap-6">
        <FormError message={state.error} />

        {!initial && data.templates.length > 0 && (
          <Card className="p-5">
            <FormSection title="Start from">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <TemplateCard active={templateId === null} onClick={() => applyTemplate(null)} icon={<FilePlus2 className="size-4" />} title="Blank" body="Build it from scratch" />
                {data.templates.map((t) => {
                  const p = data.plans.find((x) => x.id === t.planId);
                  return (
                    <TemplateCard
                      key={t.id}
                      active={templateId === t.id}
                      onClick={() => applyTemplate(t.id)}
                      icon={<FileStack className="size-4" />}
                      title={t.name}
                      body={`${p?.name ?? "Plan"} · ${t.lines.length} product${t.lines.length === 1 ? "" : "s"} · valid ${t.validityDays}d`}
                    />
                  );
                })}
              </div>
            </FormSection>
          </Card>
        )}

        <Card className="flex flex-col gap-6 p-5">
          <FormSection title="Customer">
            <Field label="Bill to" error={errors.customerId}>
              <CustomerPicker
                name="customerId"
                value={customer}
                onChange={(c) => {
                  setCustomer(c);
                  touch("customerId");
                }}
                invalid={!!errors.customerId}
              />
            </Field>
          </FormSection>

          <FormSection title="Plan">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <Field label="Plan" error={errors.planId}>
                <Select
                  name="planId"
                  value={planId}
                  onChange={(e) => {
                    setPlanId(e.target.value);
                    const p = data.plans.find((x) => x.id === e.target.value);
                    if (p && Number(planQty) < p.minQty) setPlanQty(String(p.minQty));
                  }}
                  invalid={!!errors.planId}
                >
                  {data.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.price, { whole: true })}/{PER_PERIOD[p.period]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity" hint={plan && plan.minQty > 1 ? `Minimum ${plan.minQty}` : undefined} error={errors.planQty}>
                <Input name="planQty" type="number" min={plan?.minQty ?? 1} value={planQty} onChange={(e) => setPlanQty(e.target.value)} invalid={!!errors.planQty} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Products">
            <RowsEditor<LineDraft>
              name="lines"
              rows={lines}
              onChange={setLines}
              blank={() => ({ key: rowKey(), productId: "", variantId: "", qty: "1" })}
              serialize={(rows) => rows.map((r) => ({ productId: r.productId, variantId: r.variantId || null, qty: r.qty }))}
              addLabel="Add product"
              empty="Add-ons and extra products billed with the plan."
              renderRow={(row, update) => {
                const product = data.products.find((p) => p.id === row.productId);
                return (
                  <div className="grid grid-cols-[1fr_84px] gap-2">
                    <div className="flex flex-col gap-2">
                      <Select aria-label="Product" value={row.productId} onChange={(e) => update({ productId: e.target.value, variantId: "" })}>
                        <option value="">Choose a product…</option>
                        {data.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {money(p.salesPrice, { whole: true })}
                          </option>
                        ))}
                      </Select>
                      {product && product.variants.length > 0 && (
                        <Select aria-label="Variant" value={row.variantId} onChange={(e) => update({ variantId: e.target.value })}>
                          <option value="">No variant</option>
                          {product.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.attribute}: {v.value} {v.extraPrice > 0 && `(+${money(v.extraPrice, { whole: true })})`}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                    <Input aria-label="Quantity" type="number" min={1} value={row.qty} onChange={(e) => update({ qty: e.target.value })} />
                  </div>
                );
              }}
            />
            {errors.lines && <p className="text-[13px] text-danger">{errors.lines === "Choose a product" ? "Choose a product for every line." : errors.lines}</p>}
          </FormSection>

          <FormSection title="Terms">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start date" error={errors.startDate}>
                <Input name="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} invalid={!!errors.startDate} />
              </Field>
              <Field label="Expiry date" hint="Optional. Leave empty to run until closed." error={errors.expiryDate}>
                <Input name="expiryDate" type="date" value={expiryDate} min={startDate} onChange={(e) => setExpiryDate(e.target.value)} invalid={!!errors.expiryDate} />
              </Field>
              <Field label="Payment terms" error={errors.paymentTermsDays}>
                <AffixInput name="paymentTermsDays" type="number" min={0} suffix="days" value={terms} onChange={(e) => setTerms(e.target.value)} invalid={!!errors.paymentTermsDays} className="pr-14" />
              </Field>
              <Field label="Quote valid until" error={errors.quoteValidUntil}>
                <Input name="quoteValidUntil" type="date" value={quoteValidUntil} min={today()} onChange={(e) => setQuoteValidUntil(e.target.value)} invalid={!!errors.quoteValidUntil} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Discount">
            <Field
              label="Discount"
              hint={
                preview?.discount ? (
                  preview.discount.applied ? (
                    <span className="text-success">Applies · saves {money(preview.discountTotal)} per {plan ? PER_PERIOD[plan.period] : "period"}</span>
                  ) : (
                    <span className="text-warning">Won&apos;t apply yet: {preview.discount.reason?.toLowerCase()}</span>
                  )
                ) : (
                  "Optional. Applied automatically on every invoice while it qualifies."
                )
              }
            >
              <Select name="discountId" value={discountId} onChange={(e) => setDiscountId(e.target.value)}>
                <option value="">No discount</option>
                {data.discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>
        </Card>
      </div>

      <Summary
        preview={preview}
        period={plan ? PER_PERIOD[plan.period] : "period"}
        pending={pending}
        intent={intent}
        onIntent={setIntent}
        editing={!!initial}
      />
    </form>
  );
}

function TemplateCard({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
        active ? "border-accent bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]" : "border-field-border hover:bg-hover",
      )}
    >
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", active ? "bg-accent text-white" : "bg-neutral-soft text-muted")}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium">{title}</span>
        <span className="block text-[12.5px] leading-snug text-muted">{body}</span>
      </span>
    </button>
  );
}

function Summary({
  preview,
  period,
  pending,
  intent,
  onIntent,
  editing,
}: {
  preview: (ReturnType<typeof priceLines> & { mrr: number }) | null;
  period: string;
  pending: boolean;
  intent: "draft" | "quote";
  onIntent: (i: "draft" | "quote") => void;
  editing: boolean;
}) {
  return (
    <Card className="sticky top-6 flex flex-col p-5 md:top-20">
      <h3 className="text-[12px] font-semibold tracking-wide text-muted uppercase">Summary</h3>
      <ul className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {preview?.lines.map((l, i) => (
            <motion.li
              key={l.description + i}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-baseline justify-between gap-3 text-[13.5px]"
            >
              <span className="min-w-0 truncate text-muted">
                {l.qty > 1 && <span className="tabular">{l.qty} × </span>}
                {l.description}
              </span>
              <span className="tabular">{money(l.amount)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="my-4 h-px bg-line" />
      <Row label="Subtotal" value={money(preview?.subtotal ?? 0)} />
      {!!preview?.discountTotal && <Row label="Discount" value={`−${money(preview.discountTotal)}`} className="text-success" />}
      <Row label="Tax" value={money(preview?.taxTotal ?? 0)} />
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[14px] font-medium">Total per {period}</span>
        <motion.span key={preview?.total} initial={{ opacity: 0.4, y: -2 }} animate={{ opacity: 1, y: 0 }} className="text-[22px] font-semibold tracking-tight tabular">
          {money(preview?.total ?? 0)}
        </motion.span>
      </div>
      <p className="mt-1 text-right text-[12.5px] text-muted tabular">≈ {money(preview?.mrr ?? 0, { whole: true })} monthly recurring</p>

      <div className="mt-6 flex flex-col gap-2">
        <Button type="submit" name="intent" value="quote" size="lg" disabled={pending} onClick={() => onIntent("quote")} className="h-11 rounded-xl">
          {pending && intent === "quote" ? <Loader2 className="size-[18px] animate-spin" /> : editing ? "Save and send quotation" : "Send quotation"}
        </Button>
        <Button type="submit" name="intent" value="draft" variant="secondary" size="lg" disabled={pending} onClick={() => onIntent("draft")} className="h-11 rounded-xl border border-field-border shadow-none">
          {pending && intent === "draft" ? <Loader2 className="size-[18px] animate-spin" /> : editing ? "Save changes" : "Save as draft"}
        </Button>
      </div>
    </Card>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between py-0.5 text-[13.5px]", className)}>
      <span className={className ? undefined : "text-muted"}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
