"use client";

import type { MapBrief } from "@eef/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CreationLoopScenes } from "../../components/creation-loop-scenes";
import { OpenRouterKeyForm } from "../../components/openrouter-key-form";
import { LearnLockup } from "../../components/learn-lockup";

type Checkpoint = { step: string; [k: string]: unknown };
type Phase = "intent" | "key" | "ask" | "build";

const STEP_LABELS: Record<string, string> = {
  skeleton_requested: "Reading what you asked for",
  skeleton_generated: "Charting the path",
  nodes_created: "Nesting the lessons",
  done: "Your map is ready",
};

const QUESTIONS: { key: keyof MapBrief; prompt: string; placeholder: string }[] = [
  { key: "audience", prompt: "Who is this for?", placeholder: "Just me, a class, someone new to this…" },
  { key: "startingPoint", prompt: "Where should it start?", placeholder: "Brand new, some background, already deep…" },
  { key: "depth", prompt: "How far should it go?", placeholder: "A survey, thorough, just the hard parts…" },
  { key: "notes", prompt: "Anything to include or skip?", placeholder: "Optional. Sources, chapters, things to leave out." },
];

/** Map creation: intent → key → interview → studio (or blank studio). */
export function NewMapForm({
  defaultTopic,
  hasKey,
  mock,
}: {
  defaultTopic: string;
  hasKey: boolean;
  mock: boolean;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(defaultTopic);
  const [phase, setPhase] = useState<Phase>("intent");
  const [mode, setMode] = useState<"generate" | "blank">("generate");
  const [brief, setBrief] = useState<MapBrief>({});
  const [askIndex, setAskIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [steps, setSteps] = useState<Checkpoint[]>([]);
  const afterRef = useRef(0);

  async function create(nextMode: "generate" | "blank", nextBrief?: MapBrief) {
    setError(null);
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, mode: nextMode, brief: nextBrief }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.push(`/sign-in?next=${encodeURIComponent(`/maps/new?topic=${topic}`)}`);
      return;
    }
    if (res.status === 409 && body.error === "openrouter_key_required") {
      setError(body.message ?? "Add your OpenRouter key to build a map.");
      setPhase("key");
      return;
    }
    if (!res.ok) {
      setError(body.error ?? "Could not start your map.");
      return;
    }
    setSlug(body.slug);
    if (nextMode === "blank" || !body.jobId) {
      router.push(`/maps/${body.slug}/studio`);
      return;
    }
    setJobId(body.jobId);
    setPhase("build");
  }

  function chooseGenerate() {
    const trimmed = topic.trim();
    if (trimmed.length < 2) {
      setError("Name what you want to learn first.");
      return;
    }
    setTopic(trimmed);
    setMode("generate");
    setError(null);
    if (!hasKey && !mock) {
      setPhase("key");
      return;
    }
    setPhase("ask");
  }

  function chooseBlank() {
    const trimmed = topic.trim();
    if (trimmed.length < 2) {
      setError("Name the map first.");
      return;
    }
    setTopic(trimmed);
    setMode("blank");
    void create("blank");
  }

  function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    const q = QUESTIONS[askIndex];
    const nextBrief = { ...brief, [q.key]: answer.trim() };
    setBrief(nextBrief);
    setAnswer("");
    if (askIndex < QUESTIONS.length - 1) {
      setAskIndex((i) => i + 1);
      return;
    }
    void create("generate", nextBrief);
  }

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
        setTimeout(() => router.push(`/maps/${slug}/studio`), 600);
        return;
      }
      if (body.status === "failed") {
        setError(body.error ?? "Generation failed. Please try again.");
        setJobId(null);
        setPhase("ask");
        return;
      }
      if (!cancelled) setTimeout(poll, 1200);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [jobId, slug, router]);

  const scene =
    phase === "intent" ? 0 : phase === "key" ? 1 : phase === "ask" ? 1 : 2;

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <nav className="flex items-center justify-between px-8 py-6 lg:px-16">
        <Link href="/dashboard" className="flex items-center">
          <LearnLockup />
        </Link>
        <Link href="/dashboard" className="text-sm text-star-400 hover:text-star-100">
          Back to dashboard
        </Link>
      </nav>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-12 px-6 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="w-full max-w-xl">
          {phase === "intent" && (
            <>
              <h1 className="text-4xl font-bold tracking-tight">What do you want to learn?</h1>
              <p className="mt-3 text-star-400">
                Name a topic. Ask AI to shape the path, or start blank and nest the lessons yourself.
              </p>
              {error && (
                <p role="alert" className="mt-6 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm text-ember-300">
                  {error}
                </p>
              )}
              <label className="mt-8 block">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">Topic</span>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  minLength={2}
                  maxLength={200}
                  autoFocus
                  className="mt-2 w-full rounded-2xl border border-night-800 bg-night-900 px-4 py-3 text-star-100 outline-none placeholder:text-star-400 focus:border-aurora-400"
                  placeholder="e.g. linear algebra, rust, watercolor painting"
                />
              </label>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={chooseGenerate}
                  className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
                >
                  Ask AI to build it
                </button>
                <button
                  type="button"
                  onClick={chooseBlank}
                  className="rounded-xl border border-night-800 px-6 py-3 font-semibold hover:border-star-400"
                >
                  Start from scratch
                </button>
              </div>
              <p className="mt-6 text-sm text-star-400">
                Or{" "}
                <Link href="/community" className="text-aurora-400 hover:underline">
                  open a community map
                </Link>
                .
              </p>
            </>
          )}

          {phase === "key" && (
            <>
              <h1 className="text-4xl font-bold tracking-tight">Add your key</h1>
              <p className="mt-3 text-star-400">
                Generation uses your OpenRouter key. Encrypted at rest, used only for your maps.
              </p>
              {error && (
                <p role="alert" className="mt-6 text-sm text-ember-300">
                  {error}
                </p>
              )}
              <div className="mt-8">
                <OpenRouterKeyForm
                  compact
                  initialConfigured={hasKey}
                  mock={mock}
                  onConfigured={() => {
                    setError(null);
                    setPhase("ask");
                  }}
                />
              </div>
              {mock && (
                <button
                  type="button"
                  onClick={() => setPhase("ask")}
                  className="mt-6 text-sm text-aurora-400 hover:underline"
                >
                  Skip — this instance is in mock mode
                </button>
              )}
            </>
          )}

          {phase === "ask" && (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
                {askIndex + 1} of {QUESTIONS.length}
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{QUESTIONS[askIndex].prompt}</h1>
              <p className="mt-3 text-star-400">
                One question at a time. This becomes the brief the map is built from.
              </p>
              {error && (
                <p role="alert" className="mt-6 text-sm text-ember-300">
                  {error}
                </p>
              )}
              <form onSubmit={submitAnswer} className="mt-8">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  autoFocus
                  className="w-full rounded-2xl border border-night-800 bg-night-900 px-4 py-3 text-star-100 outline-none placeholder:text-star-400 focus:border-aurora-400"
                  placeholder={QUESTIONS[askIndex].placeholder}
                  aria-label={QUESTIONS[askIndex].prompt}
                />
                <div className="mt-6 flex items-center gap-4">
                  <button type="submit" className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900">
                    {askIndex === QUESTIONS.length - 1 ? "Build the map" : "Continue"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (askIndex === QUESTIONS.length - 1) {
                        void create("generate", brief);
                        return;
                      }
                      setAskIndex((i) => i + 1);
                      setAnswer("");
                    }}
                    className="text-sm text-star-400 hover:text-star-100"
                  >
                    Skip
                  </button>
                </div>
              </form>
            </>
          )}

          {phase === "build" && (
            <div aria-live="polite">
              <h1 className="text-3xl font-bold tracking-tight">Shaping the path…</h1>
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
        <div className="hidden lg:block">
          <CreationLoopScenes step={scene} />
        </div>
      </div>
    </main>
  );
}
