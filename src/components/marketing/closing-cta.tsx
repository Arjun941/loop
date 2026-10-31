/**
 * The last word: the mark, one line, two buttons.
 */
import { Logo } from "@/components/shell/logo";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./motion";

export function ClosingCta() {
  return (
    <section className="relative px-4 py-28 sm:px-6 sm:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 mx-auto h-[420px] max-w-3xl -translate-y-1/2 opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 40% 50%, rgba(10,132,255,0.35), transparent 70%), radial-gradient(50% 50% at 62% 50%, rgba(94,92,230,0.32), transparent 70%)",
        }}
      />
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="rounded-[18px] shadow-[0_18px_40px_-12px_rgba(10,132,255,0.55)]">
          <Logo size={64} />
        </div>
        <h2 className="mt-8 text-[36px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[56px]">
          Let billing run itself.
        </h2>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-pretty text-muted sm:text-[19px]">
          Set up your plans once. Loop takes it from the first quote to the last payment.
        </p>
        <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/signup" size="lg" className="w-full rounded-full px-6 sm:w-auto">
            Get started
            <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="lg" className="w-full rounded-full px-6 sm:w-auto">
            Sign in
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
