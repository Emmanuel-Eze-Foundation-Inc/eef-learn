"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { WaypathMark } from "../../components/waypath-mark";
import { CompanionDock } from "./[node]/companion-dock";
import { CoffeeChatCard } from "./coffee-chat-card";
import { MapGraph, type GraphEdge } from "./map-graph";
import { MiniMap } from "./mini-map";
import { PublishButton } from "./publish-button";
import { StagePanel } from "./stage-panel";
import { lastUnlockedIndex, type Stage } from "./travel-types";

const TravelScene = dynamic(() => import("./travel-scene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-night-950" />,
});

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type Msg = { role: string; content: string };

/**
 * The map IS the page: full-viewport 3D world. Wheel travels the path.
 * Skeleton on the side jumps. Content HUD belongs to the star you're at.
 */
export function TravelWorld({
  mapId,
  mapSlug,
  mapTitle,
  mapVersion,
  visibility,
  isCreator,
  generationEnabled,
  stages,
  edges,
  initialIndex,
  greeting,
  companionMessages,
  alreadyRequestedChat,
}: {
  mapId: string;
  mapSlug: string;
  mapTitle: string;
  mapVersion: number;
  visibility: string;
  isCreator: boolean;
  generationEnabled: boolean;
  stages: Stage[];
  edges: GraphEdge[];
  initialIndex: number;
  greeting: string;
  companionMessages: Msg[];
  alreadyRequestedChat: boolean;
}) {
  const router = useRouter();
  const maxTravel = lastUnlockedIndex(stages);
  const start = Math.min(initialIndex, maxTravel);
  const progressRef = useRef(start);
  const [progress, setProgress] = useState(start);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [mapComplete, setMapComplete] = useState(
    stages.length > 0 && stages.every((s) => s.state === "mastered"),
  );
  const panelRef = useRef<HTMLElement | null>(null);
  const snapTimer = useRef<number | null>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = reduced;
    // WebGL / reduced-motion is client-only; resolve after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reduced || !webglAvailable()) setMode("2d");
  }, []);

  const applyProgress = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), maxTravel);
      progressRef.current = clamped;
      setProgress(clamped);
    },
    [maxTravel],
  );

  const jumpTo = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(index, 0), maxTravel);
      applyProgress(target);
      const slug = stages[target]?.slug;
      if (slug) {
        window.history.replaceState(null, "", `/maps/${mapSlug}?node=${slug}`);
      }
    },
    [applyProgress, mapSlug, maxTravel, stages],
  );

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onWheel(e: WheelEvent) {
      const panel = panelRef.current;
      if (panel && panel.contains(e.target as Node)) {
        const atTop = panel.scrollTop <= 0;
        const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
        if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
      }
      e.preventDefault();
      const step = reducedRef.current ? Math.sign(e.deltaY) * 1 : e.deltaY * 0.0022;
      applyProgress(progressRef.current + step);
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
      snapTimer.current = window.setTimeout(() => {
        const nearest = Math.round(progressRef.current);
        applyProgress(nearest);
        const slug = stages[nearest]?.slug;
        if (slug) window.history.replaceState(null, "", `/maps/${mapSlug}?node=${slug}`);
      }, reducedRef.current ? 0 : 160);
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [applyProgress, mapSlug, stages]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        jumpTo(Math.round(progressRef.current) + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        jumpTo(Math.round(progressRef.current) - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jumpTo]);

  const activeIndex = Math.min(Math.round(progress), maxTravel);
  const stage = stages[activeIndex];
  const closeness = 1 - Math.min(Math.abs(progress - activeIndex), 1);
  const nextUnlocked = activeIndex < maxTravel;

  return (
    <div className="relative h-dvh overflow-hidden bg-night-950 text-star-100">
      {mode === "3d" ? (
        <TravelScene
          nodes={stages}
          edges={edges}
          progressRef={progressRef}
          onContextLost={() => setMode("2d")}
        />
      ) : (
        <div className="absolute inset-0 flex items-center overflow-hidden bg-night-950 px-[240px] pt-24 pb-56">
          <div
            className="w-full origin-center transition-transform duration-[800ms] ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(${(1 - activeIndex) * 8}%) scale(1.08)` }}
          >
            <MapGraph
              mapSlug={mapSlug}
              nodes={stages}
              edges={edges}
              onSelect={(slug) => {
                const i = stages.findIndex((s) => s.slug === slug);
                if (i >= 0) jumpTo(i);
              }}
            />
          </div>
        </div>
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5 lg:p-6">
        <div className="pointer-events-auto flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <WaypathMark className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
          </Link>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          {isCreator && (
            <PublishButton mapId={mapId} slug={mapSlug} visibility={visibility} />
          )}
          <Link
            href="/dashboard"
            className="rounded-full border border-night-800 bg-night-950/70 px-4 py-2 text-sm text-star-400 backdrop-blur-md hover:text-star-100"
          >
            Leave map
          </Link>
        </div>
      </header>

      <div className="pointer-events-none absolute left-5 top-20 z-10 lg:left-6">
        <MiniMap nodes={stages} edges={edges} activeIndex={activeIndex} onJump={jumpTo} />
      </div>

      <div
        className="pointer-events-none absolute bottom-6 left-1/2 z-10 w-[min(42rem,calc(100%-2rem))] -translate-x-1/2 lg:left-[calc(50%+2rem)]"
        style={{ opacity: 0.45 + closeness * 0.55 }}
      >
        {stage && (
          <StagePanel
            key={stage.id}
            stage={stage}
            isCreator={isCreator}
            generationEnabled={generationEnabled}
            scrollRef={panelRef}
            onMastered={({ mapComplete: done }) => {
              if (done) setMapComplete(true);
              router.refresh();
              if (!done && nextUnlocked) jumpTo(activeIndex + 1);
            }}
          />
        )}
      </div>

      <p className="pointer-events-none absolute right-6 top-20 z-10 hidden rounded-full border border-night-800 bg-night-950/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400 backdrop-blur-md lg:block">
        {mapTitle} · v{mapVersion} · scroll to travel
      </p>

      {mapComplete && activeIndex === stages.length - 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto max-w-2xl p-6">
          <CoffeeChatCard mapId={mapId} mapTitle={mapTitle} alreadyRequested={alreadyRequestedChat} />
        </div>
      )}

      {stage && (
        <CompanionDock
          mapId={mapId}
          nodeId={stage.id}
          greeting={greeting}
          initialMessages={companionMessages}
        />
      )}
    </div>
  );
}
