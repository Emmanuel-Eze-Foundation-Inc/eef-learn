"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import { Field, FormError, SubmitButton, TextInput } from "../auth-form";

export default function SignUpPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const { error: err } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      birthdate: new Date(String(form.get("birthdate"))),
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-night-800 bg-night-900 p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-4 leading-relaxed text-star-400">
          We sent you a verification link. Open it, and your first map is one topic away.
        </p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
          Self-hosting without email? The link is in your server console.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Start your first map</h1>
      <p className="mt-3 text-star-400">
        Free forever on our community server. You must be 13 or older.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <FormError message={error} />
        <Field label="Name">
          <TextInput name="name" required placeholder="Ada Lovelace" autoComplete="name" />
        </Field>
        <Field label="Email">
          <TextInput name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <TextInput name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>
        <Field label="Birthdate">
          <TextInput name="birthdate" type="date" required aria-describedby="age-note" />
        </Field>
        <p id="age-note" className="text-sm text-star-400">
          EEF Learn is for learners 13 and up. We store your birthdate only to enforce this.
        </p>
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-star-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-aurora-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
