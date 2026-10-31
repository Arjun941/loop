import { Reveal } from "@/components/ui/page";
import { getCatalogOptions, getTemplates } from "@/server/queries/catalog";
import type { Metadata } from "next";
import { LoadingCard } from "../loading-card";
import { TemplatesManager } from "./templates-manager";

export const metadata: Metadata = { title: "Quotation templates" };

export default function TemplatesPage() {
  return (
    <Reveal fallback={<LoadingCard />}>
      <Templates />
    </Reveal>
  );
}

async function Templates() {
  const [data, options] = await Promise.all([getTemplates(), getCatalogOptions()]);
  return <TemplatesManager {...data} options={options} />;
}
