import { Reveal } from "@/components/ui/page";
import { getProducts } from "@/server/queries/catalog";
import type { Metadata } from "next";
import { LoadingCard } from "./loading-card";
import { ProductsManager } from "./_products/products-manager";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <Reveal fallback={<LoadingCard />}>
      <Products />
    </Reveal>
  );
}

async function Products() {
  const data = await getProducts();
  return <ProductsManager {...data} />;
}
