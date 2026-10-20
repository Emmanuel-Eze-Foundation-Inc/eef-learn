"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ConsentForm({
  clientName,
  clientUri,
  email,
  offline,
}: {
  clientName: string;
  clientUri: string | null;
  email: string;
  offline: boolean;
}) {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(accept: boolean) {
    setError(null);
    setPending(accept ? "accept" : "deny");
    const { error: err } = await authClient.oauth2.consent({ accept });
    if (err) {
      setPending(null);
      setError(err.message ?? "That didn't go through. Start connecting again from your AI app.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Connect {clientName} to EEF Learn</h1>
      {clientUri && <p className="mt-1 text-sm text-star-400">{new URL(clientUri).hostname}</p>}
      <p className="mt-4 leading-relaxed text-star-400">
        {clientName} will be able to act as <span className="text-star-100">{email}</span> on EEF Learn:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-star-200">
        <li>see your maps and their lessons</li>
        <li>create maps and edit lessons and blocks in maps you created</li>
        <li>publish or unpublish your maps</li>
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-star-400">
        It runs on your own AI plan; EEF Learn adds no limits.
        {offline ? " It stays connected until you disconnect it in Settings." : ""}
      </p>
      {error && <p className="mt-4 text-sm text-ember-300">{error}</p>}
      <div className="mt-6 flex gap-3">
        <Button onClick={() => decide(true)} disabled={pending !== null}>
          {pending === "accept" ? "Connecting…" : "Allow"}
        </Button>
        <Button variant="outline" onClick={() => decide(false)} disabled={pending !== null}>
          {pending === "deny" ? "Cancelling…" : "Deny"}
        </Button>
      </div>
    </div>
  );
}
