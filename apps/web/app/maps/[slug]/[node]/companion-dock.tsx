"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: string; content: string };

/** Companion dock (ticket T12): progress-aware greeting + chat, bottom-right. */
export function CompanionDock({
  mapId,
  nodeId,
  greeting,
  initialMessages,
}: {
  mapId: string;
  nodeId: string;
  greeting: string;
  initialMessages: Msg[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const text = String(new FormData(form).get("message")).trim();
    if (!text || pending) return;
    form.reset();
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setPending(true);
    const res = await fetch("/api/companion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapId, nodeId, message: text }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setPending(false);
    if (!res) {
      setError("The companion is unavailable right now.");
      return;
    }
    if (!res.ok) {
      setError(body.error ?? "The companion is unavailable right now.");
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: body.reply }]);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-aurora-400 px-5 py-3 font-semibold text-ink-900 shadow-lg"
        aria-label="Open companion chat"
      >
        ✦ Companion
      </button>
    );
  }

  return (
    <aside
      className="fixed bottom-6 right-6 z-40 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-night-800 bg-night-900 shadow-2xl"
      aria-label="Companion chat"
    >
      <header className="flex items-center justify-between border-b border-night-800 px-5 py-3.5">
        <span className="font-semibold">✦ Your companion</span>
        <button
          onClick={() => setOpen(false)}
          className="text-star-400 hover:text-star-100"
          aria-label="Close companion chat"
        >
          ✕
        </button>
      </header>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p className="rounded-xl rounded-tl-sm bg-night-800 px-4 py-3 text-sm leading-relaxed">
          {greeting}
        </p>
        {messages.map((m, i) => (
          <p
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-xl rounded-tr-sm bg-aurora-600/30 px-4 py-3 text-sm leading-relaxed"
                : "mr-4 rounded-xl rounded-tl-sm bg-night-800 px-4 py-3 text-sm leading-relaxed"
            }
          >
            {m.content}
          </p>
        ))}
        {pending && <p className="text-sm text-star-400">Thinking…</p>}
        {error && (
          <p role="alert" className="text-sm text-ember-300">
            {error}
          </p>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-night-800 p-3">
        <input
          name="message"
          required
          maxLength={4000}
          placeholder="Ask about this lesson…"
          aria-label="Message the companion"
          className="flex-1 rounded-xl border border-night-800 bg-night-950 px-3.5 py-2.5 text-sm outline-none placeholder:text-star-400 focus:border-aurora-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-aurora-400 px-4 font-semibold text-ink-900 disabled:opacity-60"
        >
          →
        </button>
      </form>
    </aside>
  );
}
