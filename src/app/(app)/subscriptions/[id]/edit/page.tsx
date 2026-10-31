import { Page, PageHeader, Reveal } from "@/components/ui/page";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { isEditable } from "@/lib/domain/subscription-status";
import { getSubscription, getSubscriptionFormData } from "@/server/queries/subscriptions";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "../../back-link";
import { FormSkeleton } from "@/components/subscriptions/form-skeleton";

export const metadata: Metadata = { title: "Edit subscription" };

export default function EditSubscriptionPage({ params }: PageProps<"/subscriptions/[id]/edit">) {
  return (
    <Page>
      <Reveal fallback={<FormSkeleton />}>
        <EditForm params={params} />
      </Reveal>
    </Page>
  );
}

async function EditForm({ params }: { params: PageProps<"/subscriptions/[id]/edit">["params"] }) {
  const { id } = await params;
  const [sub, data] = await Promise.all([getSubscription(id), getSubscriptionFormData()]);
  if (!sub) notFound();
  if (!isEditable(sub.sub.status)) redirect(`/subscriptions/${id}`);

  return (
    <>
      <BackLink href={`/subscriptions/${id}`} label={sub.sub.number} />
      <PageHeader title={`Edit ${sub.sub.number}`} subtitle="Changes apply until the customer accepts the quote." />
      <SubscriptionForm
        data={data}
        initial={{
          id,
          customer: { id: sub.customer.id, name: sub.customer.name, email: sub.customer.email },
          planId: sub.sub.planId,
          planQty: sub.lines.find((l) => !l.productId)?.qty ?? 1,
          startDate: sub.sub.startDate,
          expiryDate: sub.sub.expiryDate,
          quoteValidUntil: sub.sub.quoteValidUntil,
          paymentTermsDays: sub.sub.paymentTermsDays,
          discountId: sub.sub.discountId,
          lines: sub.lines.filter((l) => l.productId).map((l) => ({ productId: l.productId!, variantId: l.variantId, qty: l.qty })),
        }}
      />
    </>
  );
}
