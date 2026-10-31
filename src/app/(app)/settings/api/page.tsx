import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/page";
import { TableSkeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/server/auth/access";
import { appUrl } from "@/server/env";
import { listApiKeys } from "@/server/mcp/keys";
import type { Metadata } from "next";
import { ApiKeys } from "./api-keys";

export const metadata: Metadata = { title: "API & MCP" };

export default function ApiSettingsPage() {
  return (
    <Reveal fallback={<Card><TableSkeleton rows={3} /></Card>}>
      <Content />
    </Reveal>
  );
}

async function Content() {
  const user = await requireStaff();
  const keys = await listApiKeys();
  return (
    <ApiKeys
      endpoint={appUrl("/api/mcp")}
      canManage={user.role === "admin"}
      keys={keys.map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null }))}
    />
  );
}
