"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthDialog } from "@/app/components/auth-dialog";
import { LearnNav } from "@/components/chrome/learn-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { send } from "@/lib/send";

type Status = "pending" | "approved" | "declined" | null;

/** Shown instead of the map when it's private and the viewer hasn't been let in. */
export function AccessGate({
  mapId,
  title,
  topic,
  publisher,
  lessons,
  signedIn,
  status: initialStatus,
}: {
  mapId: string;
  title: string;
  topic: string;
  publisher: string;
  lessons: number;
  signedIn: boolean;
  status: Status;
}) {
  const router = useRouter();
  const dialog = useAuthDialog();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    try {
      const res: { status: Status } = await send(`/api/maps/${mapId}/access`, "POST", {
        message: message.trim() || undefined,
      });
      setStatus(res.status);
      if (res.status === "approved") {
        router.refresh();
      } else {
        toast.success(`Request sent. ${publisher} will see it on their dashboard.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the request.");
    } finally {
      setBusy(false);
    }
  }

  function body() {
    if (!signedIn) {
      return (
        <>
          <p className="text-sm leading-relaxed text-star-400">
            Sign in to ask {publisher} for access. You&apos;ll see their answer on your dashboard.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => dialog.open({ intent: "signin", next: window.location.pathname })}
          >
            Sign in to request access
          </Button>
        </>
      );
    }
    switch (status) {
      case "pending":
        return (
          <>
            <p className="text-sm leading-relaxed text-star-400">
              Your request is with {publisher}. When they approve it, this map appears under
              Learning on your dashboard.
            </p>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
          </>
        );
      case "approved":
        return <p className="text-sm text-star-400">You&apos;re in. Opening the map…</p>;
      case "declined":
      case null:
        return (
          <>
            <p className="text-sm leading-relaxed text-star-400">
              {status === "declined"
                ? `${publisher} didn't approve your last request. You can ask again with a note about why you'd like to join.`
                : `Ask ${publisher} to let you in. A short note about why you'd like to join helps.`}
            </p>
            <label htmlFor="access-note" className="mt-5 block text-sm font-medium">
              Note <span className="font-normal text-star-400">(optional)</span>
            </label>
            <Textarea
              id="access-note"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="I'm working through this for my bootcamp cohort."
              className="mt-2"
            />
            <Button className="mt-4 w-full" disabled={busy} onClick={() => void request()}>
              {busy ? "Sending…" : status === "declined" ? "Ask again" : "Request access"}
            </Button>
          </>
        );
      default: {
        const unreachable: never = status;
        return unreachable;
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <LearnNav signedIn={signedIn} onSignIn={() => dialog.open({ intent: "signin", next: window.location.pathname })} />
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <section className="w-full max-w-md rounded-2xl border border-night-800 bg-night-900/60 p-6 sm:p-8">
          <span className="grid size-10 place-items-center rounded-full bg-night-800 text-gold-400">
            <Lock className="size-4" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 text-sm text-star-400">
            A private map by {publisher}
            {lessons ? ` · ${lessons} ${lessons === 1 ? "lesson" : "lessons"}` : ""}
          </p>
          {topic && topic !== title ? <p className="mt-3 text-sm leading-relaxed">{topic}</p> : null}
          <div className="mt-6 border-t border-night-800 pt-6">{body()}</div>
        </section>
      </div>
    </main>
  );
}
