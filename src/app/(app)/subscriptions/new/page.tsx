import { Page, PageHeader, Reveal } from "@/components/ui/page";
import { FormSkeleton } from "@/components/subscriptions/form-skeleton";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { getSubscriptionFormData } from "@/server/queries/subscriptions";
import type { Metadata } from "next";
import { BackLink } from "../back-link";

export const metadata: Metadata = { title: "New subscription" };

export default function NewSubscriptionPage() {
  return (
    <Page>
      <BackLink />
      <PageHeader title="New subscription" subtitle="Start from a template, choose the customer, and send the quote." />
      <Reveal fallback={<FormSkeleton />}>
        <NewForm />
      </Reveal>
    </Page>
  );
}

async function NewForm() {
  return <SubscriptionForm data={await getSubscriptionFormData()} />;
}
