"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Stage } from "./travel-types";

/** Lesson HUD for the star you're at — lives in the world, not a separate page. */
export function StagePanel({
  stage,
  isCreator,
  generationEnabled,
  onMastered,
  compact = false,
}: {
  stage: Stage;
  isCreator: boolean;
  generationEnabled: boolean;
  onMastered: (info: { mapComplete: boolean }) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    setGenError(null);
    setGenerating(true);
    const res = await fetch(`/api/nodes/${stage.id}/sections`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGenerating(false);
      setGenError(body.error ?? "Could not start generation.");
      return;
    }
    const poll = async () => {
      const r = await fetch(`/api/jobs/${body.jobId}`);
      if (!r.ok) {
        setGenerating(false);
        return;
      }
      const j = await r.json();
      if (j.status === "succeeded") {
        setGenerating(false);
        router.refresh();
      } else if (j.status === "failed") {
        setGenerating(false);
        setGenError(j.error ?? "Generation failed.");
      } else {
        setTimeout(poll, 1200);
      }
    };
    poll();
  }, [stage.id, router]);

  useEffect(() => {
    startedRef.current = false;
  }, [stage.id]);

  useEffect(() => {
    if (!stage.blocks.length && isCreator && generationEnabled && !startedRef.current) {
      startedRef.current = true;
      generate();
    }
  }, [stage.blocks.length, isCreator, generationEnabled, generate]);

  useEffect(() => {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: stage.id }),
    });
  }, [stage.id]);

  async function markMastered() {
    setSaving(true);
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: stage.id, mastered: true }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    onMastered({ mapComplete: Boolean(body.mapComplete) });
  }

  return (
    <article
      className={`pointer-events-auto w-full max-w-xl overflow-y-auto ${
        compact ? "max-h-24 py-2" : "max-h-[34vh]"
      }`}
      data-travel-panel=""
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">
        {compact
          ? "Approaching"
          : stage.state === "mastered"
            ? "Mastered"
            : "You are here"}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">{stage.title}</h2>

      {!compact && (
        <div className="motion-safe:animate-[arrive_240ms_var(--ease-out)_both] motion-reduce:animate-none">
          {generating && (
            <p className="mt-4 flex items-center gap-3 text-sm text-star-400" aria-live="polite">
              <span className="h-2.5 w-2.5 rounded-full bg-aurora-400" />
              Writing this lesson — a few seconds…
            </p>
          )}
          {genError && (
            <p role="alert" className="mt-4 text-sm text-ember-300">
              {genError}
            </p>
          )}

          {stage.blocks.map((block) => (
            <section key={block.id} className="mt-5">
              {block.title && <h3 className="text-lg font-semibold">{block.title}</h3>}
              {block.body && (
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-star-100/90">
                  {block.body.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              {block.url && (
                <a href={block.url} className="mt-3 block text-sm text-aurora-400 hover:underline">
                  {block.url}
                </a>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-star-400">
                {block.type === "ai_text"
                  ? `AI-generated · ${block.provenanceModel ?? "unknown"} · verify claims`
                  : block.type}
              </p>
            </section>
          ))}

          {!generating && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {stage.blocks.length > 0 && stage.state !== "mastered" && (
                <button
                  type="button"
                  onClick={markMastered}
                  disabled={saving}
                  className="rounded-xl bg-gold-400 px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Mark as mastered"}
                </button>
              )}
              {isCreator && generationEnabled && (
                <button
                  type="button"
                  onClick={generate}
                  className="rounded-xl border border-night-800 px-5 py-2.5 text-sm text-star-400 hover:border-aurora-400 hover:text-star-100"
                >
                  {stage.blocks.length ? "Generate another section" : "Generate this lesson"}
                </button>
              )}
              <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-star-400">
                Scroll to travel
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
