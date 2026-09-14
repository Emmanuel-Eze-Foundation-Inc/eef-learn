"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { blockKindLabel, youtubeId } from "./content-media";
import { Flashcard } from "./flashcard";
import { Quiz } from "./quiz";
import { ReadOnChrome, ReadOnCue } from "./read-on-cue";
import { isLongForm, parseFlashcard, parseQuiz } from "./recall-data";
import type { Beat } from "./travel-types";
import { SpineSocket } from "./vertebra-grab";

function paragraphs(body: string): string[] {
  return body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

/** One idea in the center of the world. ADHD: no competing column, no dump. */
export function BeatStage({
  beat,
  focus,
  alreadyMastered,
  hasNext,
  isFirst = false,
  isLast = false,
  isCreator,
  generationEnabled,
  justEarned = false,
  onContinue,
}: {
  beat: Beat;
  focus: number;
  alreadyMastered: boolean;
  hasNext: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isCreator: boolean;
  generationEnabled: boolean;
  justEarned?: boolean;
  onContinue: () => void;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const block = beat.block;
  const video = youtubeId(block?.url) ?? youtubeId(block?.attributionUrl);
  const flashcard = block?.type === "flashcard" ? parseFlashcard(block.body) : null;
  const quiz = block?.type === "quiz" ? parseQuiz(block.body) : null;
  const longForm = isLongForm(block?.type ?? "", block?.body ?? null);
  const ideaParas =
    block?.body && !flashcard && !quiz ? paragraphs(block.body) : [];

  const generate = useCallback(async () => {
    setGenError(null);
    setGenerating(true);
    const res = await fetch(`/api/nodes/${beat.nodeId}/sections`, { method: "POST" });
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
  }, [beat.nodeId, router]);

  useEffect(() => {
    startedRef.current = false;
  }, [beat.nodeId]);

  useEffect(() => {
    if (!beat.block && isCreator && generationEnabled && !startedRef.current) {
      startedRef.current = true;
      generate();
    }
  }, [beat.block, isCreator, generationEnabled, generate]);

  useEffect(() => {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: beat.nodeId }),
    });
  }, [beat.nodeId]);

  const kind = block ? blockKindLabel(block.type) : "Arriving";
  const scale = 0.94 + focus * 0.06;
  const interactive = focus > 0.28;
  const panelRef = useRef<HTMLDivElement>(null);
  const [trail, setTrail] = useState({
    above: false,
    below: longForm,
    overflow: longForm,
  });

  const syncTrail = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const extra = el.scrollHeight - el.clientHeight;
    if (extra < 48) {
      setTrail((prev) =>
        longForm && prev.overflow ? prev : { above: false, below: false, overflow: false },
      );
      return;
    }
    setTrail({
      overflow: true,
      above: el.scrollTop > 12,
      below: el.scrollTop + el.clientHeight < el.scrollHeight - 12,
    });
  }, [longForm]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    syncTrail();
    const raf = requestAnimationFrame(syncTrail);
    const later = window.setTimeout(syncTrail, 80);
    el.addEventListener("scroll", syncTrail, { passive: true });
    const ro = new ResizeObserver(syncTrail);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(later);
      el.removeEventListener("scroll", syncTrail);
      ro.disconnect();
    };
  }, [syncTrail, beat.id, block?.body, interactive]);

  return (
    <div
      className="pointer-events-none relative mx-auto w-full"
      data-travel-live={interactive ? "" : undefined}
      style={{
        maxWidth: longForm ? "65ch" : "42rem",
        opacity: 0.08 + focus * 0.92,
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      <div className="relative z-0 w-full">
        <div
          className="relative z-0"
          style={{
            transform:
              focus >= 0.98
                ? "none"
                : `translateY(${(1 - focus) * 16}px) scale(${scale})`,
          }}
        >
        <article
          className="relative w-full overflow-hidden"
          data-long-form={longForm ? "true" : undefined}
          style={{
            background: "#0d1f18",
            boxShadow: "0 0 0 1px rgba(52,217,140,0.28), 0 24px 60px rgba(0,0,0,0.4)",
            borderRadius: "1.5rem",
            isolation: "isolate",
          }}
        >
        <div
          ref={panelRef}
          className={`max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain px-8 md:px-10 ${
            longForm ? "pt-28 pb-28" : "py-8 pb-12"
          }`}
          data-travel-panel=""
        >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aurora-400">
        {kind}
        {beat.beatsInNode > 1
          ? ` · ${beat.beatInNode + 1} of ${beat.beatsInNode}`
          : ""}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-star-100 md:text-4xl">
        {block?.title ?? beat.nodeTitle}
      </h2>

      {generating && (
        <p className="mt-6 flex items-center gap-3 text-base text-star-400" aria-live="polite">
          <span className="h-2.5 w-2.5 rounded-full bg-aurora-400" />
          Writing this beat — a few seconds…
        </p>
      )}
      {genError && (
        <p role="alert" className="mt-4 text-sm text-ember-300">
          {genError}
        </p>
      )}

      {video && (
        <div className="mt-6 overflow-hidden rounded-xl bg-night-900 shadow-[0_0_80px_rgba(52,217,140,0.12)]">
          <div className="relative aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${video}?rel=0&disablekb=1`}
              title={block?.title ?? "Lesson video"}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              tabIndex={-1}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}

      {flashcard && <Flashcard data={flashcard} />}
      {quiz && <Quiz data={quiz} />}

      {ideaParas.length > 0 && (
        <div
          className={`mt-6 space-y-4 text-lg leading-relaxed text-star-100/95 ${
            longForm ? "max-w-[65ch]" : "max-w-2xl"
          } ${block?.type === "pdf_extract" ? "pl-5 shadow-[-3px_0_12px_-4px_rgba(242,193,78,0.55)]" : ""}`}
        >
          {ideaParas.map((para, i) => (
            <p
              key={i}
              className={longForm ? "motion-safe:animate-[arrive_240ms_var(--ease-out)_both]" : undefined}
              style={longForm ? { animationDelay: `${Math.min(i * 60, 480)}ms` } : undefined}
            >
              {para}
            </p>
          ))}
        </div>
      )}

      {(block?.type === "youtube" || block?.type === "blog") && (block.url || block.attributionUrl) && (
        <a
          href={block.url ?? block.attributionUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex rounded-full border border-aurora-400/50 px-5 py-2.5 text-sm text-aurora-400 hover:bg-aurora-400/10"
        >
          {block.type === "youtube" ? "Watch on YouTube" : "Open the essay"}
        </a>
      )}

      {(block?.attributionName ||
        block?.type === "ai_text" ||
        block?.type === "youtube" ||
        block?.type === "flashcard" ||
        block?.type === "quiz") && (
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-star-400">
          {block.type === "youtube" && (block.attributionName ?? "YouTube")}
          {block.type === "blog" && (block.attributionName ?? "Essay")}
          {block.type === "pdf_extract" && (block.attributionName ?? "Paper extract")}
          {block.type === "flashcard" && "Flip when you have a guess"}
          {block.type === "quiz" && "Check tells you. Nothing is scored."}
          {block.type === "ai_text" &&
            `Guide · ${block.provenanceModel ?? "authored"} · verify claims`}
          {block.attributionUrl && block.type !== "blog" && (
            <>
              {" · "}
              <a href={block.attributionUrl} className="text-aurora-400 hover:underline" target="_blank" rel="noreferrer">
                source
              </a>
            </>
          )}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {(hasNext || !alreadyMastered) && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-aurora-400 px-5 py-2.5 text-sm font-semibold text-ink-900"
          >
            {hasNext ? "Continue" : "Complete"}
          </button>
        )}
        {isCreator && generationEnabled && (
          <button
            type="button"
            onClick={generate}
            className="rounded-xl border border-night-800 px-5 py-2.5 text-sm text-star-400 hover:border-aurora-400 hover:text-star-100"
          >
            {beat.block ? "Add another beat" : "Generate this lesson"}
          </button>
        )}
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
          {trail.overflow && hasNext
            ? "read to the end, then scroll once more"
            : hasNext
              ? "or use the arrows"
              : "or arrows to complete"}
        </p>
      </div>
        </div>
        {trail.overflow && trail.below && (
          <ReadOnChrome side="bottom">
            <ReadOnCue direction="down" mode="more" />
          </ReadOnChrome>
        )}
        {trail.overflow && !trail.below && hasNext && (
          <ReadOnChrome side="bottom">
            <ReadOnCue direction="down" mode="leave" />
          </ReadOnChrome>
        )}
        {trail.overflow && !trail.above && !isFirst && (
          <ReadOnChrome side="top">
            <ReadOnCue direction="up" mode="leave" />
          </ReadOnChrome>
        )}
        {trail.overflow && trail.above && !trail.below && (
          <ReadOnChrome side="top">
            <ReadOnCue direction="up" mode="more" />
          </ReadOnChrome>
        )}
        </article>
        </div>
        <SpineSocket side="left" terminus={isFirst ? "start" : undefined} alive={justEarned && !isFirst} />
        <SpineSocket side="right" terminus={isLast ? "end" : undefined} />
        {isFirst && (
          <p className="pointer-events-none absolute left-0 top-1/2 z-20 -translate-x-1/2 translate-y-14 font-mono text-[10px] uppercase tracking-[0.18em] text-star-100">
            Start
          </p>
        )}
        {isLast && (
          <p className="pointer-events-none absolute right-0 top-1/2 z-20 translate-x-1/2 translate-y-14 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">
            End
          </p>
        )}
      </div>
    </div>
  );
}

export function beatIsLongForm(beat: Beat): boolean {
  return isLongForm(beat.block?.type ?? "", beat.block?.body ?? null);
}
