/**
 * Public marketing pages. Fully static: nothing here reads cookies, headers or the database.
 */
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingMotion } from "@/components/marketing/motion";

// Smooth in-page anchor scrolling, only while the landing page is mounted.
const smoothScroll = "@media (prefers-reduced-motion: no-preference) { html:has([data-marketing]) { scroll-behavior: smooth; } }";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <MarketingMotion>
      <style>{smoothScroll}</style>
      {/* `isolate` keeps the soft background glows (negative z-index) above this background. */}
      <div data-marketing className="isolate flex min-h-dvh flex-col overflow-x-clip bg-bg text-fg">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </MarketingMotion>
  );
}
