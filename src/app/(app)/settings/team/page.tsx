import { Avatar } from "@/components/shell/user-menu";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/page";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { listTeam } from "@/server/queries/settings";
import type { Metadata } from "next";
import { InviteButton } from "./invite-button";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <Reveal fallback={<Card><TableSkeleton rows={3} /></Card>}>
      <Team />
    </Reveal>
  );
}

async function Team() {
  const { members, canInvite, viewerId } = await listTeam();
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Team</h2>
          <p className="text-[13px] text-muted">
            {canInvite ? "Staff handle customers, subscriptions, invoices and payments." : "Only an admin can add team members."}
          </p>
        </div>
        {canInvite && <InviteButton />}
      </div>
      <ul className="px-2 pb-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Avatar name={m.name} size={34} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium">
                {m.name} {m.id === viewerId && <span className="font-normal text-muted">(you)</span>}
              </div>
              <div className="truncate text-xs text-muted">{m.email}</div>
            </div>
            <span className="hidden text-xs text-muted sm:block">Joined {formatDate(m.createdAt)}</span>
            <Pill tone={m.role === "admin" ? "accent" : "neutral"}>{m.role === "admin" ? "Admin" : "Staff"}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}
