"use client";

import { useMemo, useState } from "react";

import { ContentMark, contentKind, kindCaption } from "./content-mark";
import { blockKindLabel } from "./content-media";
import type { Beat } from "./travel-types";

type Pt = { x: number; y: number };

function plot(i: number, n: number, w: number, h: number, depth: number): Pt {
  const t = n <= 1 ? 0 : i / (n - 1);
  return {
    x: w * 0.34 + Math.sin(i * 0.78) * (w * 0.22) + Math.min(depth, 3) * 16,
    y: 18 + t * (h - 36),
  };
}

function beatTitle(beat: Beat): string {
  return beat.block?.title ?? beat.nodeTitle;
}

function beatBlurb(beat: Beat): string {
  const type = beat.block?.type ?? "";
  if (type === "flashcard" || type === "quiz") {
    return `${kindCaption(contentKind(type))} · ${beat.nodeTitle}`;
  }
  const body = beat.block?.body?.replace(/\s+/g, " ").trim() ?? "";
  if (body.length > 8) return body.slice(0, 120);
  return beat.nodeTitle;
}

/**
 * A map of content, not a list of stars. Hover to feel a stop;
 * click to enter it. "See the map" opens the world overview.
 */
export function MiniMap({
  beats,
  activeIndex,
  overview,
  masteredIds,
  onJump,
  onToggleOverview,
}: {
  beats: Beat[];
  activeIndex: number;
  overview: boolean;
  masteredIds: Set<string>;
  onJump: (index: number) => void;
  onToggleOverview: () => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 184;
  const h = Math.max(168, 36 + beats.length * 24);
  const depthByNode = useMemo(() => {
    const parent = new Map(beats.map((b) => [b.nodeId, b.parentId]));
    const cache = new Map<string, number>();
    const depthOf = (id: string): number => {
      if (cache.has(id)) return cache.get(id)!;
      const p = parent.get(id);
      const d = p ? depthOf(p) + 1 : 0;
      cache.set(id, d);
      return d;
    };
    return new Map(beats.map((b) => [b.nodeId, depthOf(b.nodeId)]));
  }, [beats]);
  const pts = useMemo(
    () => beats.map((beat, i) => plot(i, beats.length, w, h, depthByNode.get(beat.nodeId) ?? 0)),
    [beats, depthByNode, h, w],
  );
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const shown = hover ?? (overview ? null : activeIndex);
  const tip = shown != null ? beats[shown] : null;

  return (
    <nav className="pointer-events-auto w-[11.5rem]" aria-label="Learning map">
      <button
        type="button"
        onClick={onToggleOverview}
        className={`w-full rounded-xl px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] ${
          overview ? "bg-aurora-400/15 text-aurora-400" : "text-star-400 hover:bg-night-900/80 hover:text-star-100"
        }`}
      >
        {overview ? "Close map" : "See the map"}
      </button>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-star-400">
        {activeIndex + 1} of {beats.length}
      </p>

      <div className="relative mt-3" style={{ width: w, height: h }}>
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="absolute inset-0" aria-hidden="true">
          <path d={d} fill="none" stroke="var(--aurora-400)" strokeOpacity="0.35" strokeWidth="1.5" />
        </svg>
        {beats.map((beat, i) => {
          const p = pts[i];
          const kind = contentKind(beat.block?.type);
          const current = i === activeIndex && !overview;
          const mastered = masteredIds.has(beat.nodeId);
          const locked = beat.nodeState === "locked";
          const hot = hover === i;
          return (
            <button
              key={beat.id}
              type="button"
              disabled={locked}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => onJump(i)}
              className="absolute grid place-items-center disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                left: `${Math.round(p.x)}px`,
                top: `${Math.round(p.y)}px`,
                width: "28px",
                height: "28px",
                transform: `translate(-50%, -50%) scale(${hot ? 1.18 : current ? 1.08 : 1})`,
                transition: "transform 160ms var(--ease-out)",
              }}
              aria-current={current ? "true" : undefined}
              aria-label={
                locked
                  ? `${beatTitle(beat)}, locked`
                  : `${blockKindLabel(beat.block?.type ?? "ai_text")}: ${beatTitle(beat)}`
              }
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full"
                style={{
                  background: "var(--night-950)",
                  boxShadow: hot || current ? "0 0 0 1px var(--aurora-400)" : "0 0 0 1px transparent",
                }}
              >
                <ContentMark kind={kind} mastered={mastered} current={current || hot} size={18} />
              </span>
            </button>
          );
        })}
      </div>

      {tip && (
        <div
          className="mt-3 rounded-xl bg-night-900/90 px-3 py-2.5 motion-safe:animate-[arrive_160ms_var(--ease-out)_both]"
          role="status"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">
            {kindCaption(contentKind(tip.block?.type))}
          </p>
          <p className="mt-1 text-xs font-medium leading-snug text-star-100">{beatTitle(tip)}</p>
          <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-star-400">{beatBlurb(tip)}</p>
        </div>
      )}
    </nav>
  );
}
