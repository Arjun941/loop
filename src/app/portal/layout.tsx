/**
 * Customer portal frame: deliberately simpler than the back office.
 */
import { Logo } from "@/components/shell/logo";
import { CustomerUser, UserSkeleton } from "@/components/shell/session-user";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Suspense } from "react";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-elevated backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[960px] items-center gap-3 px-5">
          <Logo size={26} />
          <span className="text-[15px] font-semibold tracking-tight">Loop</span>
          <span className="text-[15px] text-muted">Account</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<UserSkeleton compact />}>
              <CustomerUser />
            </Suspense>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
