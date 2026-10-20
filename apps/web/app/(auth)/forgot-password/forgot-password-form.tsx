"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import { Field, FormError, SubmitButton, TextInput } from "../auth-form";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error: err } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (err) {
      setError(err.status === 429 ? "Too many tries. Wait a minute, then try again." : (err.message ?? "Something went wrong."));
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-4 leading-relaxed text-star-400">
          If <span className="text-star-100">{sentTo}</span> has an EEF Learn account, a reset link is on its way. It
          works for one hour.
        </p>
        <Link href="/sign-in" className="mt-6 inline-block text-sm text-aurora-400 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-star-400">Enter your account email and we&apos;ll send you a link to choose a new one.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <FormError message={error} />
        <Field label="Email">
          <TextInput name="email" type="email" required autoComplete="email" autoFocus />
        </Field>
        <SubmitButton pending={pending}>Send reset link</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-star-400">
        Remembered it?{" "}
        <Link href="/sign-in" className="text-aurora-400 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
