"use client";

import { UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

import { plural } from "../format";
import { Field, SettingsSection } from "./section";

export function DeleteAccountSection({
  email,
  createdMaps,
  hasPassword,
}: {
  email: string;
  createdMaps: number;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed.trim().toLowerCase() === email.toLowerCase() && (!hasPassword || password.length > 0);

  async function remove() {
    setPending(true);
    setError(null);
    const { error: err } = await authClient.deleteUser(hasPassword ? { password } : {});
    if (err) {
      setPending(false);
      setError(
        err.code === "SESSION_EXPIRED"
          ? "For your safety, sign out and back in, then delete your account within a day."
          : err.message || "Couldn't delete your account.",
      );
      return;
    }
    router.push("/learn");
    router.refresh();
  }

  return (
    <SettingsSection
      id="delete"
      title="Delete account"
      danger
      description="Permanently remove your account, your progress, and every map you made."
    >
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) {
            setTyped("");
            setPassword("");
            setError(null);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" className="bg-ember-500/10 hover:bg-ember-500/20">
            Delete my account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-ember-500/10 text-ember-300">
              <UserX />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete your EEF Learn account?</AlertDialogTitle>
            <AlertDialogDescription>
              {createdMaps
                ? `Your ${plural(createdMaps, "map")} will be deleted, including public ones, and people learning them lose their progress. `
                : ""}
              Your progress, tutor chats, access requests, and saved model key go too. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <Field id="delete-confirm" label={`Type ${email} to confirm`}>
              <Input
                id="delete-confirm"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
            {hasPassword ? (
              <Field id="delete-password" label="Your password">
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-ember-300">
                {error}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep my account</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-ember-500/15 hover:bg-ember-500/25"
              disabled={!confirmed || pending}
              onClick={() => void remove()}
            >
              {pending ? "Deleting…" : "Delete forever"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
