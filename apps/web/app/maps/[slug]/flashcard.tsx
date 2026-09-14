"use client";

import { useState } from "react";

import type { FlashcardData } from "./recall-data";

/** Click to flip. Spatial: the back is the other side of the same card. */
export function Flashcard({ data }: { data: FlashcardData }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mt-6" style={{ perspective: "900px" }}>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        className="relative block w-full text-left"
        style={{ minHeight: "14rem", transformStyle: "preserve-3d" }}
      >
        <span
          className="relative block min-h-56 w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 240ms var(--ease-out)",
          }}
        >
          <span
            className="absolute inset-0 grid place-items-center rounded-2xl border border-night-800 bg-night-900 px-8 py-10 text-xl leading-relaxed text-star-100"
            aria-hidden={flipped}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {data.front}
          </span>
          <span
            className="absolute inset-0 grid place-items-center rounded-2xl border border-night-800 bg-night-900 px-8 py-10 text-xl leading-relaxed text-star-100"
            aria-hidden={!flipped}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {data.back}
          </span>
        </span>
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
        {flipped ? "Click to hide" : "Click to reveal"}
      </p>
    </div>
  );
}
