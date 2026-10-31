"use client";
/**
 * Shows an error passed back in the URL (e.g. after Google sign-in fails).
 */
import { FormError } from "@/components/form/field";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't switched on yet. Enable the Google provider in Supabase → Authentication → Providers.",
  link_expired: "That link has expired or was already used. Request a new one.",
  auth_failed: "We couldn't sign you in. Please try again.",
};

export function UrlError() {
  const code = useSearchParams().get("error");
  return (
    <div className={code ? "mb-5" : undefined}>
      <FormError message={code ? (MESSAGES[code] ?? MESSAGES.auth_failed) : undefined} />
    </div>
  );
}
