import { Reveal } from "@/components/ui/page";
import { getCatalogOptions, getDiscounts } from "@/server/queries/catalog";
import type { Metadata } from "next";
import { LoadingCard } from "../loading-card";
import { DiscountsManager } from "./discounts-manager";

export const metadata: Metadata = { title: "Discounts" };

export default function DiscountsPage() {
  return (
    <Reveal fallback={<LoadingCard />}>
      <Discounts />
    </Reveal>
  );
}

async function Discounts() {
  const [data, options] = await Promise.all([getDiscounts(), getCatalogOptions()]);
  return <DiscountsManager {...data} products={options.products} />;
}
