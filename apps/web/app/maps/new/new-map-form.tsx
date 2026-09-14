"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { WaypathMark } from "../../components/waypath-mark";

type Checkpoint = { step: string; [k: string]: unknown };

const STEP_LABELS: Record<string, string> = {
  skeleton_requested: "Reading your topic",
  skeleton_generated: "Charting the constellation",
  nodes_created: "Placing the stars",
  done: "Your map is ready",
};

/** Map creation (ticket T7): topic → job → checkpoint polling → map. */
export function NewMapForm({ defaultTopic }: { defaultTopic: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [steps, setSteps] = useState<Checkpoint[]>([]);
  const afterRef = useRef(0);
  const autoStarted = useRef(false);

  async function start(topic: string) {
    setError(null);
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.push(`/sign-in?next=${encodeURIComponent(`/maps/new?topic=${topic}`)}`);
      return;
    }
    if (!res.ok) {
      setError(body.error ?? "Could not start your map.");
      return;
    }
    setSlug(body.slug);
    setJobId(body.jobId);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await start(String(new FormData(e.currentTarget).get("topic")));
  }

  useEffect(() => {
    if (autoStarted.current || defaultTopic.length < 2) return;
    autoStarted.current = true;
    void start(defaultTopic);
    // start is stable for this mount; we only auto-fire once from the landing topic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTopic]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const poll = async () => {
      const res = await fetch(`/api/jobs/${jobId}?after=${afterRef.current}`);
      if (!res.ok || cancelled) return;
      const body = await res.json();
      if (body.checkpoints.length) {
        afterRef.current = body.nextAfter;
        setSteps((s) => [...s, ...body.checkpoints]);
      }
      if (body.status === "succeeded") {
        setTimeout(() => router.push(`/maps/${slug}`), 600);
        return;
      }
      if (body.status === "failed") {
        setError(body.error ?? "Generation failed. Please try again.");
        setJobId(null);
        return;
      }
      if (!cancelled) setTimeout(poll, 1200);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [jobId, slug, router]);

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <nav className="flex items-center justify-between px-8 py-6 lg:px-16">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-star-400 hover:text-star-100">
          Back to dashboard
        </Link>
      </nav>
      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-xl">
          {!jobId ? (
            <>
              <h1 className="text-4xl font-bold tracking-tight">What do you want to learn?</h1>
              <p className="mt-3 text-star-400">
                One topic in, a whole constellation out. Every source credited.
              </p>
              {error && (
                <p role="alert" className="mt-6 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm text-ember-300">
                  {error}
                </p>
              )}
              <form
                onSubmit={onSubmit}
                className="mt-8 flex items-center gap-2 rounded-2xl border border-night-800 bg-night-900 p-2"
              >
                <input
                  name="topic"
                  required
                  minLength={2}
                  maxLength={200}
                  autoFocus
                  defaultValue={defaultTopic}
                  className="flex-1 bg-transparent px-4 py-3 text-star-100 outline-none placeholder:text-star-400"
                  placeholder="e.g. linear algebra, rust, watercolor painting"
                  aria-label="Topic to learn"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
                >
                  Watch it build
                </button>
              </form>
            </>
          ) : (
            <div aria-live="polite">
              <h1 className="text-3xl font-bold tracking-tight">Building your map…</h1>
              <ol className="mt-8 space-y-4">
                {steps.map((cp, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${cp.step === "done" ? "bg-gold-400" : "bg-aurora-400"}`}
                    />
                    <span className={cp.step === "done" ? "text-gold-400" : ""}>
                      {STEP_LABELS[cp.step] ?? cp.step}
                    </span>
                  </li>
                ))}
                {steps[steps.length - 1]?.step !== "done" && (
                  <li className="flex items-center gap-3 text-star-400">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-star-400" />
                    <span>Working…</span>
                  </li>
                )}
              </ol>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
