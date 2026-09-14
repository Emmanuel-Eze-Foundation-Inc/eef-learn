"use client";

import Link from "next/link";

import { UnseenEngineSponsor } from "../../components/unseen-engine-sponsor";

const BURST = [
  { x: "12%", y: "18%", s: 18, delay: "40ms" },
  { x: "88%", y: "16%", s: 22, delay: "120ms" },
  { x: "8%", y: "58%", s: 14, delay: "180ms" },
  { x: "92%", y: "52%", s: 16, delay: "90ms" },
  { x: "22%", y: "84%", s: 20, delay: "220ms" },
  { x: "78%", y: "86%", s: 15, delay: "160ms" },
  { x: "50%", y: "8%", s: 26, delay: "0ms" },
  { x: "50%", y: "92%", s: 18, delay: "260ms" },
];

function GoldStar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 L13.7 9.1 L21 12 L13.7 14.9 L12 22 L10.3 14.9 L3 12 L10.3 9.1 Z"
        fill="var(--gold-400)"
      />
    </svg>
  );
}

/** Map finished: gold ignites, then the studio ad. Rare delight. */
export function MapComplete({ mapTitle }: { mapTitle: string }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto px-6 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-night-950/70 motion-safe:animate-[complete-scrim_500ms_var(--ease-out)_both] motion-reduce:opacity-100"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-[min(90vmin,720px)] w-[min(90vmin,720px)] rounded-full motion-safe:animate-[sky-bloom_900ms_var(--ease-out)_both]"
        style={{
          background:
            "radial-gradient(circle, rgba(242,193,78,0.42) 0%, rgba(52,217,140,0.12) 38%, transparent 68%)",
        }}
        aria-hidden="true"
      />
      {BURST.map((star) => (
        <span
          key={`${star.x}-${star.y}`}
          className="pointer-events-none absolute"
          style={{
            left: star.x,
            top: star.y,
            transform: "translate(-50%, -50%)",
            filter: "drop-shadow(0 0 12px rgba(242,193,78,0.75))",
          }}
          aria-hidden="true"
        >
          <span
            className="block motion-safe:animate-[star-ignite_600ms_var(--ease-out)_both] motion-reduce:animate-[arrive_150ms_var(--ease-out)_both]"
            style={{ animationDelay: star.delay }}
          >
            <GoldStar size={star.s} />
          </span>
        </span>
      ))}

      <div className="relative w-full max-w-lg">
        <div className="rounded-2xl border border-gold-400/50 bg-night-900/95 p-8 shadow-[0_0_80px_rgba(242,193,78,0.22)] motion-safe:animate-[complete-card_600ms_var(--ease-out)_180ms_both] motion-reduce:animate-[arrive_150ms_var(--ease-out)_both]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold-400">
            Map complete
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">You walked all of {mapTitle}.</h2>
          <p className="mt-4 text-base leading-relaxed text-star-400">
            The gold is yours. The next map is waiting when you are.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-xl bg-aurora-400 px-5 py-3 text-sm font-semibold text-ink-900"
          >
            Back to your maps
          </Link>
        </div>
        <div className="mt-5 motion-safe:animate-[ad-arrive_420ms_var(--ease-out)_700ms_both] motion-reduce:animate-[arrive_150ms_var(--ease-out)_both]">
          <UnseenEngineSponsor />
        </div>
      </div>
    </div>
  );
}
