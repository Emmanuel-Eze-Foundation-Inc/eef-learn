"use client";

import { useState } from "react";

export function OpenRouterKeyForm({
  compact = false,
  initialConfigured,
  mock,
  onConfigured,
}: {
  compact?: boolean;
  initialConfigured: boolean;
  mock: boolean;
  onConfigured?: () => void;
}) {
  const [configured, setConfigured] = useState(initialConfigured);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const key = String(new FormData(e.currentTarget).get("key") ?? "");
    const res = await fetch("/api/me/ai-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Could not save that key.");
      return;
    }
    setConfigured(true);
    setSaved(true);
    e.currentTarget.reset();
    onConfigured?.();
  }

  async function onClear() {
    setPending(true);
    await fetch("/api/me/ai-key", { method: "DELETE" });
    setPending(false);
    setConfigured(false);
    setSaved(false);
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-night-800 bg-night-900 p-8"}>
      <h2 className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>OpenRouter key</h2>
      <p className="mt-2 text-sm leading-relaxed text-star-400">
        Maps are generated with your key. We encrypt it at rest and use it only for your jobs.
        {mock ? " This instance is in mock mode, so a key is optional until you want a live model." : ""}
      </p>
      {configured ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">
          A key is on file{saved ? " and just saved" : ""}.
        </p>
      ) : (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
          No key stored yet.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-ember-300">
          {error}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="key"
          type="password"
          required
          minLength={20}
          autoComplete="off"
          placeholder="sk-or-..."
          aria-label="OpenRouter API key"
          className="flex-1 rounded-xl border border-night-800 bg-night-950 px-4 py-3 text-star-100 outline-none placeholder:text-star-400 focus:border-aurora-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-aurora-400 px-5 py-3 font-semibold text-ink-900 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save key"}
        </button>
      </form>
      {configured && (
        <button
          type="button"
          onClick={() => void onClear()}
          className="mt-3 text-sm text-star-400 hover:text-star-100"
        >
          Remove stored key
        </button>
      )}
      <p className="mt-4 text-sm text-star-400">
        Create a key at{" "}
        <a
          href="https://openrouter.ai/keys"
          className="text-aurora-400 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          openrouter.ai/keys
        </a>
        .
      </p>
    </div>
  );
}
