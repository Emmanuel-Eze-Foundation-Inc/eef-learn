"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EnterMapButton } from "../../components/enter-map-button";
import { LearnLockup } from "../../components/learn-lockup";
import { shortTitle, trackSpacing } from "../../maps/[slug]/path-layout";
import { PathWorld } from "../../maps/[slug]/path-world";
import type { Beat } from "../../maps/[slug]/travel-types";

export type PreviewNode = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  blockType: string | null;
  blockTitle: string | null;
  prereqTitles: string[];
};

function previewBeats(nodes: PreviewNode[]): Beat[] {
  return nodes.map((node, nodeIndex) => ({
    id: node.id,
    nodeIndex,
    nodeId: node.id,
    nodeSlug: node.slug,
    nodeTitle: node.title,
    nodeState: "available",
    parentId: node.parentId,
    beatInNode: 0,
    beatsInNode: 1,
    isLastInNode: true,
    block: node.blockType
      ? {
          id: `${node.id}-lead`,
          title: node.blockTitle,
          body: null,
          url: null,
          type: node.blockType,
          provenanceModel: null,
          attributionName: null,
          attributionUrl: null,
        }
      : null,
  }));
}

function kicker(index: number, count: number): string {
  if (index === 0) return "Start";
  if (index === count - 1) return "End";
  return `Lesson ${index + 1} of ${count}`;
}

/** Public preview: the travel order is the map. Click a stop, then decide to enter. */
export function SharePreview({
  slug,
  title,
  topic,
  publisher,
  lessonCount,
  signedIn,
  nodes,
}: {
  slug: string;
  title: string;
  topic: string;
  publisher: string;
  lessonCount: number;
  signedIn: boolean;
  nodes: PreviewNode[];
}) {
  const beats = useMemo(() => previewBeats(nodes), [nodes]);
  const [focus, setFocus] = useState<number | null>(null);
  const [spacing, setSpacing] = useState(180);

  useEffect(() => {
    const sync = () => {
      const fit = window.innerWidth / Math.max(nodes.length + 0.8, 4.2);
      setSpacing(Math.max(108, Math.min(trackSpacing(window.innerWidth), fit)));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [nodes.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFocus(null);
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      setFocus((i) => {
        const here = i ?? 0;
        return e.key === "ArrowRight"
          ? Math.min(nodes.length - 1, here + 1)
          : Math.max(0, here - 1);
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nodes.length]);

  const selected = focus != null ? nodes[focus] : null;
  const progress = focus ?? 0;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-night-950 text-star-100">
      <PathWorld
        beats={beats}
        progress={progress}
        overview
        frameAll
        spacing={spacing}
        masteredIds={new Set()}
        litBeat={focus}
        onEnter={setFocus}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 py-5 lg:px-12">
        <div className="pointer-events-auto">
          <Link href="/community" className="flex items-center">
            <LearnLockup />
          </Link>
          <p className="mt-5 text-2xl font-bold tracking-tight md:text-[26px]">{title}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            {lessonCount} lessons · shared by {publisher} · from “{topic}”
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <Link
            href="/community"
            className="hidden rounded-full border border-night-800 px-4 py-2 text-sm text-star-400 hover:border-star-400 hover:text-star-100 sm:inline"
          >
            Community maps
          </Link>
          <EnterMapButton slug={slug} signedIn={signedIn} label="Enter at the start" />
        </div>
      </header>

      {selected && focus != null && (
        <aside
          className="pointer-events-auto absolute left-1/2 top-[22%] z-30 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-aurora-400 bg-night-900 px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] md:left-auto md:right-[12%] md:translate-x-0"
          aria-live="polite"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aurora-400">
            {kicker(focus, nodes.length)}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{selected.title}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-star-400">
            {selected.prereqTitles.length
              ? `Builds on: ${selected.prereqTitles.map(shortTitle).join(", ")}`
              : focus === 0
                ? "The first stop on this path."
                : "Next along the same path. Sign in to travel it."}
          </p>
          <EnterMapButton
            slug={slug}
            signedIn={signedIn}
            node={selected.slug}
            label="Travel here"
            className="mt-4 w-full rounded-full bg-aurora-400 py-3 text-sm font-semibold text-ink-900"
          />
          <button
            type="button"
            onClick={() => setFocus(null)}
            className="mt-3 w-full text-center text-xs text-star-400 hover:text-star-100"
          >
            Stay on the map
          </button>
        </aside>
      )}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-5 py-5 lg:px-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-star-400">
          Start · the path is the order · End
        </p>
        <p className="max-w-[28ch] text-right text-xs text-star-400">
          Preview the whole map. Click a lesson, then decide to enter.
        </p>
      </footer>
    </main>
  );
}
