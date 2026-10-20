"use client";

import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { send } from "@/lib/send";

import { Field, SettingsSection } from "./section";

export type LinkedAccount = { id: string; providerId: string };

const RETURN_TO = "/dashboard?tab=settings";
const MIN_PASSWORD = 8;

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.5 10.5 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function errorText(err: { message?: string } | null | undefined, fallback: string) {
  return err?.message || fallback;
}

function EmailForm({ email, verified }: { email: string; verified: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setNotice(null);
    const { error } = await authClient.changeEmail({ newEmail: next.trim(), callbackURL: RETURN_TO });
    setPending(false);
    if (error) {
      toast.error(errorText(error, "Couldn't change your email."));
      return;
    }
    if (verified) {
      setNotice(`We sent a confirmation link to ${email}. Open it to move your account to ${next.trim()}.`);
    } else {
      toast.success("Email updated.");
      router.refresh();
    }
    setOpen(false);
    setNext("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Mail className="size-4 shrink-0 text-star-400" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-xs text-star-400">
              {verified ? (
                <span className="inline-flex items-center gap-1 text-aurora-400">
                  <CheckCircle2 className="size-3" aria-hidden /> Verified
                </span>
              ) : (
                "Not verified yet"
              )}
            </p>
          </div>
        </div>
        {open ? null : (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            Change email
          </Button>
        )}
      </div>
      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field id="new-email" label="New email">
              <Input
                id="new-email"
                type="email"
                required
                autoComplete="email"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !next.trim()}>
              {pending ? "Sending…" : verified ? "Send confirmation" : "Update email"}
            </Button>
          </div>
        </form>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg border border-aurora-400/30 bg-aurora-400/5 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

function PasswordForm({
  hasPassword,
  onSet,
  onSessionsChange,
}: {
  hasPassword: boolean;
  onSet: () => void;
  onSessionsChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (next !== confirm) return setError("The two new passwords don't match.");
    setPending(true);
    setError(null);
    try {
      if (hasPassword) {
        const { error: err } = await authClient.changePassword({
          currentPassword: current,
          newPassword: next,
          revokeOtherSessions: signOutOthers,
        });
        if (err) throw new Error(errorText(err, "Couldn't change your password."));
        toast.success(signOutOthers ? "Password changed. Other devices were signed out." : "Password changed.");
        if (signOutOthers) onSessionsChange();
      } else {
        await send("/api/me/password", "POST", { newPassword: next });
        toast.success("Password added. You can now sign in with your email too.");
        onSet();
      }
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <KeyRound className="size-4 shrink-0 text-star-400" aria-hidden />
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-xs text-star-400">
              {hasPassword ? "Sign in with your email and password." : "No password yet. You sign in with Google."}
            </p>
          </div>
        </div>
        {open ? null : (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            {hasPassword ? "Change password" : "Add a password"}
          </Button>
        )}
      </div>
      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-night-800 p-4">
          {hasPassword ? (
            <Field id="current-password" label="Current password">
              <Input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-password" label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
              <Input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field id="confirm-password" label="Confirm new password">
              <Input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </div>
          {hasPassword ? (
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>Sign out of other devices</span>
              <Switch checked={signOutOthers} onCheckedChange={setSignOutOthers} />
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {error ? (
              <p role="alert" className="mr-auto text-sm text-ember-300">
                {error}
              </p>
            ) : null}
            <Button type="button" variant="ghost" onClick={reset} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : hasPassword ? "Change password" : "Add password"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function GoogleRow({
  accountId,
  canUnlink,
  onChange,
}: {
  accountId: string | null;
  canUnlink: boolean;
  onChange: () => void;
}) {
  const linked = accountId !== null;
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    if (accountId) {
      const { error } = await authClient.unlinkAccount({ accountId });
      setPending(false);
      if (error) return void toast.error(errorText(error, "Couldn't disconnect Google."));
      toast.success("Google disconnected.");
      onChange();
      return;
    }
    const { error } = await authClient.linkSocial({ provider: "google", callbackURL: RETURN_TO });
    if (error) {
      setPending(false);
      toast.error(errorText(error, "Couldn't connect Google."));
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <GoogleMark />
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            Google {linked ? <Badge variant="aurora">Connected</Badge> : null}
          </p>
          <p className="text-xs text-star-400">
            {linked
              ? canUnlink
                ? "Sign in with one click."
                : "Your only way to sign in. Add a password before disconnecting."
              : "Connect it to sign in with one click."}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || (linked && !canUnlink)}
        onClick={() => void toggle()}
      >
        {pending ? "Working…" : linked ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}

export function AccountSection({
  email,
  emailVerified,
  googleEnabled,
  accounts,
  onAccountsChange,
  onSessionsChange,
}: {
  email: string;
  emailVerified: boolean;
  googleEnabled: boolean;
  accounts: LinkedAccount[] | null;
  onAccountsChange: () => void;
  onSessionsChange: () => void;
}) {
  const hasPassword = Boolean(accounts?.some((a) => a.providerId === "credential"));
  const google = accounts?.find((a) => a.providerId === "google") ?? null;

  return (
    <SettingsSection id="account" title="Sign-in and security" description="Your email, password, and the ways you sign in.">
      <div className="flex flex-col divide-y divide-night-800 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        <EmailForm email={email} verified={emailVerified} />
        {accounts ? (
          <>
            <PasswordForm hasPassword={hasPassword} onSet={onAccountsChange} onSessionsChange={onSessionsChange} />
            {googleEnabled || google ? (
              <GoogleRow accountId={google?.id ?? null} canUnlink={hasPassword} onChange={onAccountsChange} />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-star-400">Loading sign-in methods…</p>
        )}
      </div>
    </SettingsSection>
  );
}
