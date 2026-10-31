import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href = "/subscriptions", label = "Subscriptions" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="-ml-1 mb-3 inline-flex items-center gap-0.5 text-[14px] text-accent hover:underline">
      <ChevronLeft className="size-4" /> {label}
    </Link>
  );
}
