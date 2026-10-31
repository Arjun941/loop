/**
 * The right-hand column of every sign-in screen: heading, form body and a footer link.
 */
import { Logo } from "@/components/shell/logo";
import { ViewTransition, type ReactNode } from "react";

export function AuthForm({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    // Each screen fades in as it replaces the previous one; the brand panel stays still.
    <ViewTransition enter="page" exit="page" default="none">
      <div className="w-full max-w-[380px]">
        <div className="mb-10 lg:hidden">
          <Logo size={36} />
        </div>
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <p className="mt-8 text-[14px] text-muted">{footer}</p>}
      </div>
    </ViewTransition>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[12px] text-subtle">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
