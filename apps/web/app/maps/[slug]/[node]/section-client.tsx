"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Client half of the section view (ticket T10):
 * - auto-generates the first content block on arrival (creator, empty node)
 * - polls job checkpoints while generating
 * - "Mark as mastered" progress trigger → next node or map completion
 */
export function SectionClient({
  nodeId,
  isCreator,
  hasBlocks,
  generationEnabled,
  mapSlug,
  nextNodeSlug,
}: {
  nodeId: string;
  isCreator: boolean;
  hasBlocks: boolean;
  generationEnabled: boolean;
  mapSlug: string;
  nextNodeSlug: string | null;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapComplete, setMapComplete] = useState(false);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    setGenError(null);
    setGenerating(true);
    const res = await fetch(`/api/nodes/${nodeId}/sections`, { method: "POST" });
    const body = await res.json();
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
  }, [nodeId, router]);

  // lessons generate when you arrive (product promise); creator-only like regeneration
  useEffect(() => {
    if (!hasBlocks && isCreator && generationEnabled && !startedRef.current) {
      startedRef.current = true;
      generate();
    }
  }, [hasBlocks, isCreator, generationEnabled, generate]);

  // record arrival as in-progress
  useEffect(() => {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId }),
    });
  }, [nodeId]);

  async function markMastered() {
    setSaving(true);
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, mastered: true }),
    });
    const body = await res.json();
    setSaving(false);
    if (body.mapComplete) {
      setMapComplete(true);
      setTimeout(() => router.push(`/maps/${mapSlug}?complete=1`), 900);
    } else if (nextNodeSlug) {
      router.push(`/maps/${mapSlug}/${nextNodeSlug}`);
    } else {
      router.push(`/maps/${mapSlug}`);
    }
  }

  return (
    <div className="mt-10">
      {generating && (
        <div className="flex items-center gap-3 rounded-2xl border border-night-800 bg-night-900 p-6" aria-live="polite">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-aurora-400" />
          <span className="text-star-400">Writing this lesson for you — a few seconds…</span>
        </div>
      )}
      {genError && (
        <p role="alert" className="rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm text-ember-300">
          {genError}
        </p>
      )}
      {mapComplete && (
        <p className="rounded-2xl border border-gold-400/50 bg-gold-400/10 p-6 text-gold-400">
          ★ Map complete. Every star is yours.
        </p>
      )}
      {!generating && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {hasBlocks && (
            <button
              onClick={markMastered}
              disabled={saving}
              className="rounded-xl bg-gold-400 px-6 py-3 font-semibold text-ink-900 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Mark as mastered"}
            </button>
          )}
          {hasBlocks && isCreator && generationEnabled && (
            <button
              onClick={generate}
              className="rounded-xl border border-night-800 px-6 py-3 text-star-400 hover:border-aurora-400 hover:text-star-100"
            >
              Generate another section
            </button>
          )}
        </div>
      )}
    </div>
  );
}
