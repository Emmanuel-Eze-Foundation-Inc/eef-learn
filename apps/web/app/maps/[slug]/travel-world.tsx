"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { LearnLockup } from "../../components/learn-lockup";
import { CompanionDock } from "./[node]/companion-dock";
import { BeatStage, beatIsLongForm } from "./beat-stage";
import { MapComplete } from "./map-complete";
import { easeOutCubic, SPACING_X, trackSpacing, worldOffset } from "./path-layout";
import { PathWorld } from "./path-world";
import { PublishButton } from "./publish-button";
import {
  firstBeatOfNode,
  lastUnlockedBeatIndex,
  lastUnlockedIndex,
  stagesToBeats,
  type Stage,
} from "./travel-types";

type Msg = { role: string; content: string };

const TRAVEL_MS = 800;
const REDUCED_MS = 150;
/** One viewport per beat. Wheel snaps; a flick is enough. */
const BEAT_VH = 100;
const WHEEL_SNAP_PX = 64;
/** Quiet gap after an edge flick so inertia cannot yank the next beat. */
const LEAVE_IDLE_MS = 120;
/** Ignore leftover 1px ticks once the extra-scroll is armed. */
const LEAVE_INTENT_PX = 1;

function wheelDeltaY(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

function wheelDeltaX(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaX * 16;
  if (e.deltaMode === 2) return e.deltaX * window.innerWidth;
  return e.deltaX;
}

function eventElement(e: Event): Element | null {
  const t = e.target;
  if (t instanceof Element) return t;
  if (t instanceof Text) return t.parentElement;
  return null;
}

function liveOverflowPanel(): HTMLElement | null {
  const live = document.querySelector("[data-travel-live]");
  if (!live) return null;
  const panel = live.querySelector<HTMLElement>("[data-travel-panel]");
  if (!panel) return null;
  if (panel.scrollHeight - panel.clientHeight < 48) return null;
  return panel;
}

function panelAtBottom(panel: HTMLElement): boolean {
  return panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 12;
}

function panelAtTop(panel: HTMLElement): boolean {
  return panel.scrollTop <= 12;
}

/**
 * Scroll streams one beat at a time through a 3D path. Content is the
 * destination. The skeleton is how you jump. Chrome stays out of the way.
 */
export function TravelWorld({
  mapId,
  mapSlug,
  mapTitle,
  visibility,
  isCreator,
  generationEnabled,
  stages,
  initialIndex,
  greeting,
  companionMessages,
}: {
  mapId: string;
  mapSlug: string;
  mapTitle: string;
  visibility: string;
  isCreator: boolean;
  generationEnabled: boolean;
  stages: Stage[];
  initialIndex: number;
  greeting: string;
  companionMessages: Msg[];
}) {
  const beats = useMemo(() => stagesToBeats(stages), [stages]);
  const lastNode = lastUnlockedIndex(stages);
  const maxTravel = lastUnlockedBeatIndex(beats, lastNode);
  const start = Math.min(firstBeatOfNode(beats, initialIndex), maxTravel);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(start);
  const [progress, setProgress] = useState(start);
  const [reduced, setReduced] = useState(false);
  const [masteredIds, setMasteredIds] = useState(
    () => new Set(stages.filter((s) => s.state === "mastered").map((s) => s.id)),
  );
  const [mapComplete, setMapComplete] = useState(
    stages.length > 0 && stages.every((s) => s.state === "mastered"),
  );
  const [celebrateBlend, setCelebrateBlend] = useState(0);
  const [overview, setOverview] = useState(false);
  const [spacing, setSpacing] = useState(SPACING_X);
  const [litBeat, setLitBeat] = useState<number | null>(null);
  const litClear = useRef(0);
  const jumpAnim = useRef<number | null>(null);
  const jumpTarget = useRef<number | null>(null);
  const seeded = useRef(false);
  const lastArrived = useRef(start);
  const completing = useRef(new Set<string>());
  const wheelAcc = useRef(0);
  const edgeLatch = useRef<"none" | "hold-next" | "ready-next" | "hold-prev" | "ready-prev">(
    "none",
  );
  const edgeIdle = useRef(0);

  useEffect(() => {
    // Reduced-motion is client-only; resolve after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const updateSpacing = () => setSpacing(trackSpacing(window.innerWidth));
    updateSpacing();
    window.addEventListener("resize", updateSpacing);
    return () => window.removeEventListener("resize", updateSpacing);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevOverflow;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const progressFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0 || maxTravel <= 0) return 0;
    return (el.scrollTop / max) * maxTravel;
  }, [maxTravel]);

  const scrollTopFor = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      if (!el) return 0;
      const max = el.scrollHeight - el.clientHeight;
      if (maxTravel <= 0) return 0;
      return (Math.min(Math.max(index, 0), maxTravel) / maxTravel) * max;
    },
    [maxTravel],
  );

  const syncUrl = useCallback(
    (index: number) => {
      const slug = beats[index]?.nodeSlug;
      if (slug) window.history.replaceState(null, "", `/maps/${mapSlug}?node=${slug}`);
    },
    [beats, mapSlug],
  );

  const lightBeat = useCallback(
    (index: number) => {
      setLitBeat(index);
      window.clearTimeout(litClear.current);
      litClear.current = window.setTimeout(() => setLitBeat(null), reduced ? 180 : 780);
    },
    [reduced],
  );

  useEffect(() => () => window.clearTimeout(litClear.current), []);

  const completeStar = useCallback(
    (nodeId: string) => {
      if (masteredIds.has(nodeId) || completing.current.has(nodeId)) return;
      completing.current.add(nodeId);
      const next = new Set(masteredIds).add(nodeId);
      setMasteredIds(next);
      if (stages.length > 0 && stages.every((s) => next.has(s.id))) {
        setMapComplete(true);
      }
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, mastered: true }),
      })
        .then((res) => res.json().catch(() => ({})))
        .then((body) => {
          if (body.mapComplete) setMapComplete(true);
        })
        .finally(() => {
          completing.current.delete(nodeId);
        });
    },
    [masteredIds, stages],
  );

  const jumpTo = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      const target = Math.min(Math.max(index, 0), maxTravel);
      if (jumpAnim.current && jumpTarget.current === target) return;
      if (!el) {
        progressRef.current = target;
        setProgress(target);
        lastArrived.current = target;
        syncUrl(target);
        return;
      }
      if (jumpAnim.current) cancelAnimationFrame(jumpAnim.current);
      edgeLatch.current = "none";
      window.clearTimeout(edgeIdle.current);
      if (typeof document !== "undefined") {
        const active = document.activeElement;
        if (active instanceof HTMLIFrameElement) active.blur();
      }
      const fromScroll = el.scrollTop;
      const to = scrollTopFor(target);
      const fromP = progressRef.current;
      const delta = to - fromScroll;
      if (Math.abs(delta) < 1 && Math.abs(target - fromP) < 0.02) {
        el.scrollTop = to;
        progressRef.current = target;
        setProgress(target);
        lastArrived.current = target;
        jumpTarget.current = null;
        syncUrl(target);
        return;
      }
      const duration = reduced ? REDUCED_MS : TRAVEL_MS;
      const t0 = performance.now();
      jumpTarget.current = target;
      const step = (now: number) => {
        const t = Math.min((now - t0) / duration, 1);
        const eased = easeOutCubic(t);
        el.scrollTop = fromScroll + delta * eased;
        const p = fromP + (target - fromP) * eased;
        progressRef.current = p;
        setProgress(p);
        if (t < 1) {
          jumpAnim.current = requestAnimationFrame(step);
        } else {
          jumpAnim.current = null;
          jumpTarget.current = null;
          el.scrollTop = to;
          progressRef.current = target;
          setProgress(target);
          lastArrived.current = target;
          syncUrl(target);
        }
      };
      jumpAnim.current = requestAnimationFrame(step);
    },
    [maxTravel, reduced, scrollTopFor, syncUrl],
  );

  const goTo = useCallback(
    (index: number) => {
      const from = Math.round(progressRef.current);
      const target = Math.min(Math.max(index, 0), maxTravel);
      if (target > from) lightBeat(from);
      if (target === from + 1) {
        const leaving = beats[from];
        if (leaving?.isLastInNode) completeStar(leaving.nodeId);
      }
      if (target === from && from === maxTravel) {
        const last = beats[from];
        if (last?.isLastInNode) completeStar(last.nodeId);
        lightBeat(from);
      }
      jumpTo(target);
    },
    [beats, completeStar, jumpTo, lightBeat, maxTravel],
  );

  const enterBeat = useCallback(
    (index: number) => {
      setOverview(false);
      jumpTo(index);
    },
    [jumpTo],
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || seeded.current) return;
    seeded.current = true;
    el.scrollTop = scrollTopFor(start);
    progressRef.current = start;
    setProgress(start);
  }, [scrollTopFor, start]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      const next = e.key === "ArrowDown" || e.key === "PageDown";
      const prev = e.key === "ArrowUp" || e.key === "PageUp";
      const skip = e.key === "ArrowRight";
      const back = e.key === "ArrowLeft";
      const start = e.key === "Home";
      const end = e.key === "End";
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setOverview((v) => !v);
        return;
      }
      if (overview && e.key === "Enter") {
        e.preventDefault();
        setOverview(false);
        return;
      }

      const panel = !overview ? liveOverflowPanel() : null;
      const line = e.key === "PageDown" || e.key === "PageUp" ? Math.round((panel?.clientHeight ?? 320) * 0.82) : 72;
      if (panel && next) {
        e.preventDefault();
        if (!panelAtBottom(panel)) {
          panel.scrollTop += line;
          edgeLatch.current = "none";
          return;
        }
        if (edgeLatch.current === "ready-next") {
          edgeLatch.current = "none";
          goTo(Math.round(progressRef.current) + 1);
          return;
        }
        edgeLatch.current = "ready-next";
        return;
      }
      if (panel && prev) {
        e.preventDefault();
        if (!panelAtTop(panel)) {
          panel.scrollTop -= line;
          edgeLatch.current = "none";
          return;
        }
        if (edgeLatch.current === "ready-prev") {
          edgeLatch.current = "none";
          goTo(Math.round(progressRef.current) - 1);
          return;
        }
        edgeLatch.current = "ready-prev";
        return;
      }

      if (skip || (next && !panel)) {
        e.preventDefault();
        goTo(Math.round(progressRef.current) + 1);
        return;
      }
      if (back || (prev && !panel)) {
        e.preventDefault();
        goTo(Math.round(progressRef.current) - 1);
        return;
      }
      if (start) {
        e.preventDefault();
        goTo(0);
        return;
      }
      if (end) {
        e.preventDefault();
        goTo(maxTravel);
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [goTo, overview, maxTravel]);

  useEffect(() => {
    function armEdge(dir: "next" | "prev") {
      const hold = dir === "next" ? "hold-next" : "hold-prev";
      const ready = dir === "next" ? "ready-next" : "ready-prev";
      if (edgeLatch.current === ready) return;
      edgeLatch.current = hold;
      window.clearTimeout(edgeIdle.current);
      edgeIdle.current = window.setTimeout(() => {
        if (edgeLatch.current === hold) edgeLatch.current = ready;
      }, LEAVE_IDLE_MS);
    }

    function onWheel(e: WheelEvent) {
      const target = eventElement(e);
      if (target?.closest("iframe, input, textarea, [aria-label='Companion chat']")) return;
      const dx = wheelDeltaX(e);
      const dy = wheelDeltaY(e);
      const horizontal = Math.abs(dx) > Math.abs(dy) * 1.15;
      const delta = horizontal ? dx : dy;

      if (!horizontal && !overview) {
        const panel = liveOverflowPanel();
        if (panel) {
          const atTop = panelAtTop(panel);
          const atBottom = panelAtBottom(panel);
          if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) {
            edgeLatch.current = "none";
            window.clearTimeout(edgeIdle.current);
            return;
          }
          e.preventDefault();
          if (jumpAnim.current) return;
          const dir = dy > 0 ? "next" : "prev";
          const ready = dir === "next" ? "ready-next" : "ready-prev";
          if (edgeLatch.current === ready) {
            if (Math.abs(dy) < LEAVE_INTENT_PX) return;
            edgeLatch.current = "none";
            window.clearTimeout(edgeIdle.current);
            wheelAcc.current = 0;
            goTo(Math.round(progressRef.current) + (dy > 0 ? 1 : -1));
            return;
          }
          armEdge(dir);
          return;
        }
      }

      e.preventDefault();
      if (jumpAnim.current) return;
      edgeLatch.current = "none";
      window.clearTimeout(edgeIdle.current);
      wheelAcc.current += delta;
      if (Math.abs(wheelAcc.current) < WHEEL_SNAP_PX) return;
      const dir = wheelAcc.current > 0 ? 1 : -1;
      wheelAcc.current = 0;
      goTo(Math.round(progressRef.current) + dir);
    }
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.clearTimeout(edgeIdle.current);
    };
  }, [goTo, overview]);

  function onScroll() {
    if (jumpAnim.current) return;
    const next = progressFromScroll();
    progressRef.current = next;
    setProgress(next);
    const arrived = Math.min(Math.round(next), maxTravel);
    if (arrived === lastArrived.current + 1) {
      const leaving = beats[lastArrived.current];
      if (leaving?.isLastInNode) completeStar(leaving.nodeId);
    }
    lastArrived.current = arrived;
  }

  const lo = Math.min(Math.floor(progress), maxTravel);
  const hi = Math.min(Math.ceil(progress), maxTravel);
  const frac = Math.min(Math.max(progress - lo, 0), 1);
  const traveling = lo !== hi;
  const leaving = beats[lo];
  const arriving = beats[hi];
  const parkedBeat = traveling ? arriving : leaving;
  const parked = Math.abs(progress - Math.round(progress)) < 0.04;
  const lastBeat = beats.length - 1;
  const pathFocus = overview ? 0 : parked ? 1 : 0;
  const showComplete =
    mapComplete && parked && !overview && Math.abs(progress - lastBeat) < 0.08;
  const here = Math.round(progress);

  useEffect(() => {
    if (!showComplete) {
      setCelebrateBlend(0);
      return;
    }
    const duration = reduced ? REDUCED_MS : 1200;
    const t0 = performance.now();
    let id = 0;
    const step = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      setCelebrateBlend(easeOutCubic(t));
      if (t < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [showComplete, reduced]);

  return (
    <div className="relative h-dvh bg-night-950 text-star-100">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="fixed inset-0 z-0 overflow-x-hidden overflow-y-auto overscroll-none scrollbar-none [&::-webkit-scrollbar]:hidden"
        aria-label="Travel the map"
      >
        {Array.from({ length: maxTravel + 1 }, (_, i) => (
          <div key={i} style={{ height: `${BEAT_VH}vh` }} />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0 z-10">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <PathWorld
          beats={beats}
          progress={progress}
          focus={pathFocus}
          celebrate={celebrateBlend}
          overview={overview}
          spacing={spacing}
          masteredIds={masteredIds}
          litBeat={litBeat}
          onEnter={enterBeat}
        />
      </div>

        <header className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5 lg:p-6">
          <div className="pointer-events-auto">
            <Link href="/dashboard" className="flex items-center">
              <LearnLockup />
            </Link>
            <p className="mt-1 max-w-52 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
              {mapTitle}
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOverview((v) => !v)}
              className="rounded-full border border-night-800/80 bg-night-950/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400 backdrop-blur-md hover:text-star-100"
            >
              {overview ? "Close map" : "See the map"}
            </button>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-star-400 sm:inline">
              {here + 1} of {beats.length}
            </span>
            {isCreator && (
              <>
                <Link
                  href={`/maps/${mapSlug}/studio`}
                  className="rounded-full border border-night-800/80 bg-night-950/50 px-4 py-2 text-sm text-star-400 backdrop-blur-md hover:text-star-100"
                >
                  Studio
                </Link>
                <PublishButton mapId={mapId} slug={mapSlug} visibility={visibility} />
              </>
            )}
            <Link
              href="/dashboard"
              className="rounded-full border border-night-800/80 bg-night-950/50 px-4 py-2 text-sm text-star-400 backdrop-blur-md hover:text-star-100"
            >
              Leave map
            </Link>
          </div>
        </header>

        {!showComplete && !overview && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-6"
            style={{ isolation: "isolate" }}
          >
            {leaving && (
              <StageRide
                index={lo}
                progress={progress}
                count={beats.length}
                spacing={spacing}
                longForm={beatIsLongForm(leaving)}
              >
                <BeatStage
                  key={leaving.id}
                  beat={leaving}
                  focus={traveling ? 1 - frac : 1}
                  alreadyMastered={masteredIds.has(leaving.nodeId)}
                  hasNext={lo < maxTravel}
                  isFirst={lo === 0}
                  isLast={lo === maxTravel}
                  isCreator={isCreator}
                  generationEnabled={generationEnabled}
                  justEarned={litBeat === lo - 1}
                  onContinue={() => goTo(lo + 1)}
                />
              </StageRide>
            )}
            {traveling && arriving && arriving.id !== leaving?.id && (
              <StageRide
                index={hi}
                progress={progress}
                count={beats.length}
                spacing={spacing}
                longForm={beatIsLongForm(arriving)}
              >
                <BeatStage
                  key={arriving.id}
                  beat={arriving}
                  focus={frac}
                  alreadyMastered={masteredIds.has(arriving.nodeId)}
                  hasNext={hi < maxTravel}
                  isFirst={hi === 0}
                  isLast={hi === maxTravel}
                  isCreator={isCreator}
                  generationEnabled={generationEnabled}
                  justEarned={litBeat === hi - 1}
                  onContinue={() => goTo(hi + 1)}
                />
              </StageRide>
            )}
          </div>
        )}

        {showComplete && <MapComplete mapTitle={mapTitle} />}
      </div>

      {parkedBeat && !showComplete && !overview && (
        <CompanionDock
          mapId={mapId}
          nodeId={parkedBeat.nodeId}
          greeting={greeting}
          initialMessages={companionMessages}
        />
      )}
    </div>
  );
}

function StageRide({
  index,
  progress,
  count,
  spacing,
  longForm,
  children,
}: {
  index: number;
  progress: number;
  count: number;
  spacing: number;
  longForm: boolean;
  children: ReactNode;
}) {
  const offset = worldOffset(index, progress, count, spacing);
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        transform: `translate3d(${offset.x}px, 0, 0)`,
      }}
    >
      {children}
    </div>
  );
}
