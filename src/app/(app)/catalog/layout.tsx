import { Page, PageHeader } from "@/components/ui/page";
import { TabsNav } from "@/components/ui/tabs-nav";

const TABS = [
  { href: "/catalog", label: "Products" },
  { href: "/catalog/plans", label: "Plans" },
  { href: "/catalog/templates", label: "Quotation templates" },
  { href: "/catalog/discounts", label: "Discounts" },
  { href: "/catalog/taxes", label: "Taxes" },
];

export default function CatalogLayout({ children }: LayoutProps<"/catalog">) {
  return (
    <Page>
      <PageHeader title="Catalog" subtitle="What you sell, how often you bill for it, and how it's priced." />
      <TabsNav tabs={TABS} />
      {children}
    </Page>
  );
}
