"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import { Field, FormError, SubmitButton, TextInput } from "../auth-form";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setPending(true);
    const { error: err } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (err) {
      setError(
        err.code === "INVALID_TOKEN"
          ? "This link has expired or was already used. Ask for a new one."
          : (err.message ?? "Something went wrong."),
      );
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">This link has expired</h1>
        <p className="mt-4 leading-relaxed text-star-400">
          Reset links work once, for one hour. Ask for a new one and use the newest email.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
        >
          Send a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Password changed</h1>
        <p className="mt-4 leading-relaxed text-star-400">
          You&apos;re signed out everywhere else. Sign in with your new password to pick up where you left off.
        </p>
        <Link href="/sign-in" className="mt-6 inline-block rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-star-400">At least 8 characters. You&apos;ll be signed out on every other device.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <FormError message={error} />
        <Field label="New password">
          <TextInput name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="Confirm password">
          <TextInput name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <SubmitButton pending={pending}>Change password</SubmitButton>
      </form>
    </div>
  );
}
