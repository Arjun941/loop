import { LogoWordmark } from "@/components/shell/logo";
import Link from "next/link";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#ai", label: "AI" },
  { href: "/login", label: "Sign in" },
  { href: "/portal", label: "Customer portal" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <LogoWordmark size={22} />
          <p className="text-[13px] text-muted">Subscription billing that runs itself.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13px] text-muted transition-colors hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-10 text-[12px] text-subtle sm:px-6">© 2026 Loop</div>
    </footer>
  );
}
