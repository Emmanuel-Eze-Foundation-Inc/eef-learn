"use client";

import { useState } from "react";

/**
 * Map-completion celebration + coffee chat request (ticket T13, UC-2).
 * Shown only when every node on the map is mastered. Requests go to EEF
 * admins who match manually from the alumni pool.
 */
export function CoffeeChatCard({
  mapId,
  mapTitle,
  alreadyRequested,
}: {
  mapId: string;
  mapTitle: string;
  alreadyRequested: boolean;
}) {
  const [requested, setRequested] = useState(alreadyRequested);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const res = await fetch("/api/coffee-chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId,
        availability: String(data.get("availability") ?? ""),
        note: String(data.get("note") ?? ""),
      }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setPending(false);
    if (!res?.ok) {
      setError(body.error ?? "Something went wrong — please try again.");
      return;
    }
    setRequested(true);
  }

  return (
    <section
      aria-label="Map complete"
      className="mt-10 rounded-2xl border border-gold-400/40 bg-night-900 p-8"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-400">
        ★ Map complete
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">
        Every star on &ldquo;{mapTitle}&rdquo; is yours.
      </h2>

      {requested ? (
        <p className="mt-4 max-w-xl text-star-400">
          Your coffee chat request is in. Someone from the EEF community will
          reach out by email to set up your 30 minutes — usually within a few
          days.
        </p>
      ) : (
        <>
          <p className="mt-4 max-w-xl text-star-400">
            Want to talk it through with a real person? Request a 30-minute
            coffee chat and the EEF team will match you with someone from the
            community who knows this ground.
          </p>
          <form onSubmit={submit} className="mt-6 max-w-xl space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                When are you usually free?
              </span>
              <input
                name="availability"
                required
                maxLength={500}
                placeholder="e.g. weekday evenings ET, or weekends"
                className="w-full rounded-xl border border-night-800 bg-night-950 px-4 py-3 text-sm outline-none placeholder:text-star-400 focus:border-aurora-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Anything you&rsquo;d like to focus on? <span className="text-star-400">(optional)</span>
              </span>
              <textarea
                name="note"
                maxLength={2000}
                rows={3}
                placeholder="Questions, projects, where you're headed next…"
                className="w-full rounded-xl border border-night-800 bg-night-950 px-4 py-3 text-sm outline-none placeholder:text-star-400 focus:border-aurora-400"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-ember-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-gold-400 px-6 py-3 font-semibold text-ink-900 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Request a coffee chat"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
