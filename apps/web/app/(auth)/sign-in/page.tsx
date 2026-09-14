"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/paths";

import { Field, FormError, SubmitButton, TextInput } from "../auth-form";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const { error: err } = await authClient.signIn.email({
      email,
      password: String(form.get("password")),
    });
    setPending(false);
    if (err) {
      if (err.status === 403) {
        setUnverifiedEmail(email);
        setError("Your email isn't verified yet. Check your inbox for the link.");
      } else {
        setError(err.message ?? "Sign in failed. Check your email and password.");
      }
      return;
    }
    router.push(next);
  }

  async function resend() {
    if (!unverifiedEmail) return;
    await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: next });
    setResent(true);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-3 text-star-400">Your maps are where you left them.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <FormError message={error} />
        {unverifiedEmail && (
          <button
            type="button"
            onClick={resend}
            disabled={resent}
            className="text-sm text-aurora-400 hover:underline disabled:opacity-60"
          >
            {resent ? "Verification email sent." : "Resend verification email"}
          </button>
        )}
        <Field label="Email">
          <TextInput name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <TextInput name="password" type="password" required autoComplete="current-password" />
        </Field>
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-star-400">
        New here?{" "}
        <Link href="/sign-up" className="text-aurora-400 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <p className="text-star-400">Loading sign in…</p>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
