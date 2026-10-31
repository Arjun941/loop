import { Card } from "@/components/ui/card";
import { EmptyState, Reveal } from "@/components/ui/page";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { listEmails } from "@/server/queries/settings";
import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { EmailList } from "./email-list";

export const metadata: Metadata = { title: "Emails" };

export default function EmailsPage() {
  return (
    <Reveal fallback={<Card><TableSkeleton rows={6} /></Card>}>
      <Emails />
    </Reveal>
  );
}

async function Emails() {
  const { rows } = await listEmails();
  return (
    <Card className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState icon={<Mail className="size-5" />} title="No emails yet" body="Invoices, reminders and account emails will appear here as they're sent." />
      ) : (
        // Times are formatted here, on the server, so the browser's Intl data can't produce different text.
        <EmailList rows={rows.map(({ createdAt, ...r }) => ({ ...r, sentAt: formatDateTime(createdAt, { short: true }) }))} />
      )}
    </Card>
  );
}
