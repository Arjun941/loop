import { Reveal } from "@/components/ui/page";
import { getCatalogOptions, getTaxes } from "@/server/queries/catalog";
import type { Metadata } from "next";
import { LoadingCard } from "../loading-card";
import { TaxesManager } from "./taxes-manager";

export const metadata: Metadata = { title: "Taxes" };

export default function TaxesPage() {
  return (
    <Reveal fallback={<LoadingCard />}>
      <Taxes />
    </Reveal>
  );
}

async function Taxes() {
  const [data, options] = await Promise.all([getTaxes(), getCatalogOptions()]);
  return <TaxesManager {...data} products={options.products} />;
}
