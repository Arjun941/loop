import { AiSection } from "@/components/marketing/ai-section";
import { BeforeAfter } from "@/components/marketing/before-after";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { Lifecycle } from "@/components/marketing/lifecycle";
import type { Metadata } from "next";

const title = "Loop: subscription billing that runs itself";
const description =
  "Quotes, subscriptions, invoices, payments and revenue in one place. Loop bills on the right day, matches bank payments to invoices, and shows what’s at risk.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, type: "website", siteName: "Loop" },
  twitter: { card: "summary", title, description },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <BeforeAfter />
      <Lifecycle />
      <Features />
      <AiSection />
      <ClosingCta />
    </>
  );
}
