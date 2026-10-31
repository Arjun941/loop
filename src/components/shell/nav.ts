import { CreditCard, FileText, Home, LayoutGrid, Repeat, Settings, Users } from "lucide-react";

export const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/catalog", label: "Catalog", icon: LayoutGrid },
] as const;

export const SECONDARY_NAV = [{ href: "/settings", label: "Settings", icon: Settings }] as const;

/**
 * Whether a nav item is the current section. Uses the top-level segment (e.g. "subscriptions")
 * rather than the full path, so pages with ids in the URL can still prerender their frame.
 */
export function isActive(segment: string | null, href: string) {
  return segment === href.slice(1);
}
