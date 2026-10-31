/**
 * Frame for signed-out screens: brand panel on the left (desktop), form on the right.
 * The panel lives in the layout, so moving between sign-in and sign-up only swaps the form.
 */
import { BrandPanel } from "@/components/auth/brand-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center px-6 py-14 sm:px-10">{children}</main>
    </div>
  );
}
