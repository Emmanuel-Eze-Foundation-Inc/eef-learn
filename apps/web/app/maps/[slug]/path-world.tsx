"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ContentMark, contentKind, kindCaption } from "./content-mark";
import { blockKindLabel } from "./content-media";
import { plateHalfWidth, shortTitle, worldOffset } from "./path-layout";
import type { Beat } from "./travel-types";

function beatTitle(beat: Beat): string {
  return beat.block?.title ?? beat.nodeTitle;
}

function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, box };
}

function polyline(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function fourPointStar(cx: number, cy: number, r: number): string {
  const inner = r * 0.32;
  return [
    `M ${cx} ${cy - r}`,
    `L ${cx + inner} ${cy - inner}`,
    `L ${cx + r} ${cy}`,
    `L ${cx + inner} ${cy + inner}`,
    `L ${cx} ${cy + r}`,
    `L ${cx - inner} ${cy + inner}`,
    `L ${cx - r} ${cy}`,
    `L ${cx - inner} ${cy - inner}`,
    "Z",
  ].join(" ");
}

/**
 * Waypath around the lesson: one polyline, sockets at the plate,
 * neighbors on the line, farther stops receding.
 */
export function PathWorld({
  beats,
  progress,
  celebrate = 0,
  overview = false,
  spacing,
  masteredIds: _masteredIds,
  litBeat = null,
  frameAll = false,
  onEnter,
}: {
  beats: Beat[];
  progress: number;
  focus?: number;
  celebrate?: number;
  overview?: boolean;
  spacing: number;
  masteredIds: Set<string>;
  litBeat?: number | null;
  frameAll?: boolean;
  onEnter: (index: number) => void;
}) {
  const { ref, box } = useBox();
  const clip = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const here = Math.round(progress);
  const last = beats.length - 1;
  const originX = box.w / 2;
  const originY = box.h * 0.5;
  const step =
    frameAll && box.w > 0
      ? Math.max(96, Math.min(spacing, box.w / Math.max(beats.length + 0.6, 4)))
      : overview && box.w > 0
        ? Math.max(140, Math.min(spacing, box.w / 5.2))
        : spacing;
  const camera = frameAll ? Math.max(last, 0) / 2 : progress;
  const gapHalf = overview || frameAll ? 0 : plateHalfWidth(box.w);
  const pts = beats.map((_, i) => {
    const o = worldOffset(i, camera, beats.length, step);
    return { x: originX + o.x, y: originY + (overview || frameAll ? o.y * (frameAll ? 1.8 : 1) : 0) };
  });
  const leftEdge = { x: originX - gapHalf, y: originY };
  const rightEdge = { x: originX + gapHalf, y: originY };
  const leftPts = overview ? pts : [...pts.filter((p) => p.x < leftEdge.x), leftEdge];
  const rightPts = overview ? [] : [rightEdge, ...pts.filter((p) => p.x > rightEdge.x)];
  const tilt = overview ? 32 : 0;

  return (
    <div
      ref={ref}
      className="absolute inset-0 bg-night-950"
      style={{
        isolation: "isolate",
        transform: "translateZ(0)",
        overflow: "hidden",
        backgroundImage:
          "radial-gradient(ellipse 70% 50% at 50% 48%, rgba(14,122,85,0.14), transparent 55%), radial-gradient(ellipse 90% 80% at 50% 100%, rgba(6,16,12,1), transparent 50%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          perspective: overview ? "1200px" : undefined,
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: tilt ? `rotateX(${tilt}deg)` : undefined,
            willChange: tilt ? "transform" : undefined,
          }}
        >
          {box.w > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${box.w} ${box.h}`}
              aria-hidden="true"
            >
              <defs>
                <clipPath id={`${clip}-left`} clipPathUnits="userSpaceOnUse">
                  <rect x="0" y="0" width={Math.max(originX - gapHalf, 0)} height={box.h} />
                </clipPath>
                <clipPath id={`${clip}-right`} clipPathUnits="userSpaceOnUse">
                  <rect
                    x={originX + gapHalf}
                    y="0"
                    width={Math.max(box.w - originX - gapHalf, 0)}
                    height={box.h}
                  />
                </clipPath>
                <filter id={`${clip}-earned`} x="-40%" y="-80%" width="180%" height="260%">
                  <feGaussianBlur stdDeviation="3.5" result="bloom" />
                  <feMerge>
                    <feMergeNode in="bloom" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {leftPts.length > 1 && (
                <g clipPath={overview ? undefined : `url(#${clip}-left)`}>
                  <path
                    d={polyline(leftPts)}
                    fill="none"
                    stroke="var(--gold-400)"
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.18}
                  />
                  <path
                    d={polyline(leftPts)}
                    fill="none"
                    stroke="var(--gold-400)"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                    filter={`url(#${clip}-earned)`}
                  />
                </g>
              )}
              {rightPts.length > 1 && (
                <g clipPath={overview ? undefined : `url(#${clip}-right)`}>
                  <path
                    d={polyline(rightPts)}
                    fill="none"
                    stroke="var(--aurora-400)"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="7 11"
                    opacity={0.85}
                  />
                </g>
              )}
              {overview && pts.length > 1 && (
                <path
                  d={polyline(pts)}
                  fill="none"
                  stroke="var(--aurora-400)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {celebrate > 0.02 && pts.length > 1 && (
                <path
                  d={polyline(pts)}
                  fill="none"
                  stroke="var(--gold-400)"
                  strokeWidth={6 + celebrate * 10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.2 + celebrate * 0.55}
                  style={{ filter: "drop-shadow(0 0 16px rgba(242,193,78,0.8))" }}
                />
              )}
              {pts.map((p, i) => {
                const dist = Math.abs((frameAll ? (litBeat ?? hover ?? -1) : progress) - i);
                const underPlate = dist < 0.42 && !overview && !frameAll;
                if (underPlate) return null;
                if (!overview && !frameAll && Math.abs(p.x - originX) > box.w * 0.72) return null;
                const isStart = i === 0;
                const isEnd = i === last;
                const adjacent = dist > 0.35 && dist < 1.45;
                const earned = frameAll ? false : i + 0.4 < progress;
                const r = adjacent || isStart || isEnd ? 11 : earned ? 8 : 6;
                if (isEnd) {
                  return (
                    <path
                      key={`n-${beats[i].id}`}
                      d={fourPointStar(p.x, p.y, adjacent ? 16 : 13)}
                      fill="var(--gold-400)"
                    />
                  );
                }
                if (isStart) {
                  return (
                    <g key={`n-${beats[i].id}`}>
                      <path
                        d={`M ${p.x - r - 10} ${p.y - 10} V ${p.y + 10}`}
                        stroke="var(--star-100)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <circle cx={p.x} cy={p.y} r={r + 2} fill="var(--night-950)" />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={r + 2}
                        fill="none"
                        stroke="var(--star-100)"
                        strokeWidth="2.4"
                      />
                      <circle cx={p.x} cy={p.y} r={4} fill="var(--star-100)" />
                    </g>
                  );
                }
                return (
                  <circle
                    key={`n-${beats[i].id}`}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill="var(--night-950)"
                    stroke={
                      earned
                        ? "var(--gold-400)"
                        : adjacent
                          ? "var(--aurora-400)"
                          : "var(--star-400)"
                    }
                    strokeWidth={earned || adjacent ? 2.4 : 1.6}
                    strokeDasharray={earned || adjacent ? undefined : "3 4"}
                    opacity={earned ? 1 : adjacent ? 0.95 : 0.55}
                  />
                );
              })}
            </svg>
          )}

          {box.w > 0 &&
            beats.map((beat, i) => {
              const p = pts[i];
              const dist = Math.abs((frameAll ? (litBeat ?? hover ?? -1) : progress) - i);
              const onStation = frameAll ? litBeat === i : i === here;
              const underPlate = dist < 0.42 && !overview && !frameAll;
              const locked = !frameAll && beat.nodeState === "locked";
              const earned = frameAll ? false : i + 0.4 < progress;
              const kind = contentKind(beat.block?.type);
              const hot = hover === i;
              const adjacent = dist > 0.35 && dist < 1.45;
              const recede = Math.max(0, dist - 1);
              const isStart = i === 0;
              const isEnd = i === last;
              const lighting = litBeat === i;
              if (underPlate) return null;
              if (!overview && !frameAll && Math.abs(p.x - originX) > box.w * 0.72) return null;
              const scale = adjacent || onStation || hot || isStart || isEnd || lighting || frameAll ? 1 : Math.max(0.55, 1 - recede * 0.22);
              const size = frameAll
                ? hot || lighting
                  ? 52
                  : 44
                : adjacent || hot || lighting
                  ? 48
                  : isStart || isEnd
                    ? 40
                    : earned
                      ? 34
                      : 28;
              const caption = frameAll
                ? `${isStart ? "Start · " : isEnd ? "End · " : ""}${shortTitle(beat.nodeTitle)}`
                : isStart
                  ? "Start"
                  : isEnd
                    ? "End"
                    : kindCaption(kind);
              const showCaption = frameAll || isStart || isEnd || adjacent || hot || lighting;
              return (
                <div
                  key={beat.id}
                  className="absolute"
                  style={{
                    left: p.x,
                    top: p.y,
                    width: size,
                    height: size,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    zIndex: 30 - i,
                    opacity: earned
                      ? Math.max(0.78, 1 - recede * 0.12)
                      : adjacent || onStation || isStart || isEnd
                        ? 1
                        : Math.max(0.38, 1 - recede * 0.28),
                  }}
                >
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onEnter(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="pointer-events-auto grid h-full w-full place-items-center rounded-full disabled:cursor-not-allowed"
                    aria-label={
                      locked
                        ? `${isStart ? "Start · " : isEnd ? "End · " : ""}${beatTitle(beat)}, locked`
                        : `${isStart ? "Start" : isEnd ? "End" : blockKindLabel(beat.block?.type ?? "ai_text")}: ${beatTitle(beat)}${earned ? ", completed" : ""}`
                    }
                    aria-current={onStation ? "true" : undefined}
                  >
                    {!isStart && !isEnd && (
                      <ContentMark
                        kind={kind}
                        mastered={earned}
                        current={!earned && (hot || adjacent || onStation)}
                        ignite={lighting}
                        size={adjacent || hot || lighting ? 22 : earned ? 16 : 13}
                      />
                    )}
                  </button>
                  {showCaption && (
                    <span
                      className={`pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[0.16em] ${
                        frameAll ? "max-w-[7.5rem] whitespace-normal" : "whitespace-nowrap"
                      } ${
                        isEnd || earned
                          ? "text-gold-400"
                          : isStart
                            ? "text-star-100"
                            : adjacent
                              ? "text-aurora-400"
                              : "text-star-400"
                      }`}
                    >
                      {caption}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
