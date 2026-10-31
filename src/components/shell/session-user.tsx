/**
 * Reads the signed-in user on the server and renders their menu.
 * It also acts as the back-office gate: customers are redirected to /portal
 * and stale sessions to /login, even on pages that load no data of their own.
 */
import { requireStaff, requireCustomer } from "@/server/auth/access";
import { UserMenu } from "./user-menu";

export async function StaffUser({ compact, placement }: { compact?: boolean; placement?: "up" | "down" }) {
  const user = await requireStaff();
  return <UserMenu user={user} compact={compact} placement={placement} />;
}

export async function CustomerUser() {
  const user = await requireCustomer();
  return <UserMenu user={user} compact placement="down" />;
}

export function UserSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <span className="skeleton size-7 rounded-full" />
      {!compact && <span className="skeleton h-3 w-24" />}
    </div>
  );
}
