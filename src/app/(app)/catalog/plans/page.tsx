import { Reveal } from "@/components/ui/page";
import { getPlans } from "@/server/queries/catalog";
import type { Metadata } from "next";
import { LoadingCard } from "../loading-card";
import { PlansManager } from "./plans-manager";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <Reveal fallback={<LoadingCard />}>
      <Plans />
    </Reveal>
  );
}

async function Plans() {
  const data = await getPlans();
  return <PlansManager {...data} />;
}
