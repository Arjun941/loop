import { Page, PageHeader } from "@/components/ui/page";
import { TabsNav } from "@/components/ui/tabs-nav";

const TABS = [
  { href: "/settings", label: "General" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/emails", label: "Emails" },
  { href: "/settings/api", label: "API & MCP" },
];

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <Page>
      <PageHeader title="Settings" subtitle="Company, people and communication." />
      <TabsNav tabs={TABS} />
      {children}
    </Page>
  );
}
