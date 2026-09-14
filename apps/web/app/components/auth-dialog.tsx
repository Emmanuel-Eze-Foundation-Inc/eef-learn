"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/paths";

import { Field, FormError, SubmitButton, TextInput } from "../(auth)/auth-form";

export type AuthIntent = "signin" | "signup";

type OpenOpts = {
  next?: string;
  topic?: string;
  intent?: AuthIntent;
};

type AuthDialogValue = {
  open: (opts?: OpenOpts) => void;
  close: () => void;
};

const AuthDialogContext = createContext<AuthDialogValue | null>(null);

export function useAuthDialog() {
  const ctx = useContext(AuthDialogContext);
  if (!ctx) throw new Error("useAuthDialog must be used inside AuthDialogProvider");
  return ctx;
}

function destination(next?: string, topic?: string) {
  if (topic && topic.trim().length >= 2) {
    return `/maps/new?topic=${encodeURIComponent(topic.trim())}`;
  }
  return safeNextPath(next ?? null);
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.5v2.9h3.9c2.3-2.1 3.6-5.2 3.6-8.5z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-2.9c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3c2 4 6.1 6.5 10.6 6.5z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.5c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1V7.3H1.4C.5 9.1 0 11 0 13s.5 3.9 1.4 5.7l4-3.2z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.5 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

function setBirthdateCookie(value: string) {
  document.cookie = `eef-birthdate=${encodeURIComponent(value)}; max-age=600; path=/; SameSite=Lax`;
}

export function AuthPanel({
  googleEnabled,
  next,
  topic,
  intent = "signin",
  onSuccess,
}: {
  googleEnabled: boolean;
  next?: string;
  topic?: string;
  intent?: AuthIntent;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthIntent>(intent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const where = destination(next, topic);

  async function finish() {
    onSuccess?.();
    router.push(where);
    router.refresh();
  }

  async function onGoogle() {
    setError(null);
    if (mode === "signup") {
      const form = document.getElementById("auth-birthdate") as HTMLInputElement | null;
      const birthdate = form?.value ?? "";
      if (!birthdate) {
        setError("Add your birthdate first. EEF Learn is for learners 13 and up.");
        return;
      }
      setBirthdateCookie(birthdate);
    }
    setPending(true);
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: where,
    });
    setPending(false);
    if (err) setError(err.message ?? "Google sign in failed.");
  }

  async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const { error: err } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Sign in failed. Check your email and password.");
      return;
    }
    await finish();
  }

  async function onSignUp(e: React.FormEvent<HTMLFormElement>) {
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
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
        <p className="mt-4 leading-relaxed text-star-400">
          We sent a verification link. Open it, then your map is one topic away.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mr-10 flex rounded-full border border-night-800 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-full px-4 py-2 ${mode === "signin" ? "bg-night-800 text-star-100" : "text-star-400"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-full px-4 py-2 ${mode === "signup" ? "bg-night-800 text-star-100" : "text-star-400"}`}
        >
          Create account
        </button>
      </div>

      {mode === "signin" ? (
        <>
          <h2 className="mt-6 text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-star-400">Your maps are where you left them.</p>
        </>
      ) : (
        <>
          <h2 className="mt-6 text-2xl font-bold tracking-tight">Start your first map</h2>
          <p className="mt-2 text-star-400">Free on this community server. You must be 13 or older.</p>
        </>
      )}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => void onGoogle()}
            disabled={pending}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-night-800 bg-night-900 px-6 py-3.5 font-semibold text-star-100 transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-star-400 disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>
          <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            or use email
          </p>
        </>
      )}

      {mode === "signin" ? (
        <form onSubmit={onSignIn} className="mt-4 space-y-4">
          <FormError message={error} />
          <Field label="Email">
            <TextInput name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <TextInput name="password" type="password" required autoComplete="current-password" />
          </Field>
          <SubmitButton pending={pending}>Sign in</SubmitButton>
        </form>
      ) : (
        <form onSubmit={onSignUp} className="mt-4 space-y-4">
          <FormError message={error} />
          <Field label="Name">
            <TextInput name="name" required autoComplete="name" placeholder="Ada Lovelace" />
          </Field>
          <Field label="Email">
            <TextInput name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <TextInput name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Birthdate">
            <TextInput id="auth-birthdate" name="birthdate" type="date" required aria-describedby="age-note" />
          </Field>
          <p id="age-note" className="text-sm text-star-400">
            We store your birthdate only to enforce the 13+ age policy.
          </p>
          <SubmitButton pending={pending}>Create account</SubmitButton>
        </form>
      )}
    </div>
  );
}

export function AuthDialogProvider({
  children,
  googleEnabled,
}: {
  children: React.ReactNode;
  googleEnabled: boolean;
}) {
  const [opts, setOpts] = useState<(OpenOpts & { open: boolean }) | null>(null);
  const titleId = useId();

  const open = useCallback((next?: OpenOpts) => {
    setOpts({ open: true, ...next });
  }, []);
  const close = useCallback(() => setOpts(null), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    if (!opts?.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [opts?.open, close]);

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      {opts?.open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close sign in"
            className="absolute inset-0 bg-night-950/80"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md max-h-[min(90dvh,44rem)] overflow-y-auto rounded-[1.75rem] border border-night-800 bg-night-900 p-6 shadow-[0_24px_80px_rgba(6,16,12,0.65)] sm:p-8"
          >
            <p id={titleId} className="sr-only">
              Sign in or create an account
            </p>
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-star-400 hover:text-star-100"
              aria-label="Close"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </button>
            <AuthPanel
              key={`${opts.intent ?? "signin"}:${opts.next ?? ""}:${opts.topic ?? ""}`}
              googleEnabled={googleEnabled}
              next={opts.next}
              topic={opts.topic}
              intent={opts.intent ?? "signin"}
              onSuccess={close}
            />
          </div>
        </div>
      )}
    </AuthDialogContext.Provider>
  );
}
