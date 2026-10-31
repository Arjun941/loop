import { AuthForm } from "@/components/auth/auth-form";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/server/auth/access";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a password" };

/**
 * Reached from a password-reset or staff-invite email (`?invite=1`). The link signs the person in
 * via /auth/callback first, so a session here means the link was valid.
 */
export default function ResetPage({ searchParams }: PageProps<"/reset">) {
  return (
    <Suspense fallback={<ResetSkeleton />}>
      <ResetContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetContent({ searchParams }: Pick<PageProps<"/reset">, "searchParams">) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const invite = sp.invite === "1";

  if (!user) {
    return (
      <AuthForm title="This link has expired" subtitle="Links work once and expire after a while, to keep your account safe.">
        <ButtonLink href="/forgot" size="lg" className="h-11 w-full rounded-xl">
          Send a new link
        </ButtonLink>
      </AuthForm>
    );
  }

  return (
    <AuthForm
      title={invite ? `Welcome, ${user.name.split(" ")[0]}` : "Choose a new password"}
      subtitle={invite ? "Set a password to join the team." : <>For <span className="text-fg">{user.email}</span></>}
    >
      <ResetForm submitLabel={invite ? "Set password and continue" : "Save password"} />
    </AuthForm>
  );
}

function ResetSkeleton() {
  return (
    <div className="w-full max-w-[380px]">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 w-40" />
      <Skeleton className="mt-10 h-11 w-full rounded-xl" />
      <Skeleton className="mt-5 h-11 w-full rounded-xl" />
    </div>
  );
}
