/**
 * Back-office frame for admin and staff: sidebar with account and appearance controls,
 * a search pill floating at the top, and the command bar. No top bar, so content gets the full height.
 */
import { CommandBar } from "@/components/shell/command-bar";
import { Logo } from "@/components/shell/logo";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SearchDock } from "@/components/shell/search-dock";
import { StaffUser, UserSkeleton } from "@/components/shell/session-user";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Suspense } from "react";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar
        footer={
          <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
            <div className="min-w-0 flex-1">
              <Suspense fallback={<UserSkeleton />}>
                <StaffUser />
              </Suspense>
            </div>
            <ThemeToggle />
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones have no sidebar: a plain header row that scrolls away with the page. */}
        <header className="flex items-center gap-3 px-5 pt-4 md:hidden">
          <Logo size={28} />
          <SearchDock variant="inline" />
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<UserSkeleton compact />}>
              <StaffUser compact placement="down" />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 pb-24 md:pb-12">{children}</main>
      </div>
      <SearchDock />
      <MobileNav />
      <CommandBar />
    </div>
  );
}
