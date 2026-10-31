import { AuthForm, OrDivider } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";
import { UrlError } from "@/components/auth/url-error";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to your account."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense>
        <UrlError />
      </Suspense>
      <GoogleButton />
      <OrDivider />
      <LoginForm />
    </AuthForm>
  );
}
