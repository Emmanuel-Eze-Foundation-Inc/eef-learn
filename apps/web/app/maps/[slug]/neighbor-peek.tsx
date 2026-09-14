"use client";

import { ContentMark, contentKind, kindCaption } from "./content-mark";
import type { Beat } from "./travel-types";

export function NeighborPeek({
  beat,
  side,
  mastered,
  onOpen,
}: {
  beat: Beat;
  side: "prev" | "next";
  mastered: boolean;
  onOpen: () => void;
}) {
  const kind = contentKind(beat.block?.type);
  const yaw = side === "prev" ? 22 : -22;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`pointer-events-auto absolute top-1/2 z-20 hidden w-36 flex-col items-center gap-2 lg:flex ${
        side === "prev" ? "left-4" : "right-4"
      }`}
      style={{
        transform: `translateY(-50%) rotateY(${yaw}deg)`,
        transformStyle: "preserve-3d",
        perspective: "600px",
      }}
      aria-label={`${side === "prev" ? "Previous" : "Next"}: ${beat.block?.title ?? beat.nodeTitle}`}
    >
      <ContentMark kind={kind} mastered={mastered} size={34} />
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-star-400">
        {kindCaption(kind)}
      </span>
      <span className="line-clamp-2 text-center text-xs leading-snug text-star-100">
        {beat.block?.title ?? beat.nodeTitle}
      </span>
    </button>
  );
}
