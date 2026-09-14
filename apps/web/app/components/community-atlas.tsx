"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { PublicMap } from "@/lib/public-maps";

import { useAuthDialog } from "./auth-dialog";
import { MapSkyCard } from "./map-sky-card";
import { UnseenEngineSponsor } from "./unseen-engine-sponsor";
import { LearnLockup } from "./learn-lockup";

function matches(map: PublicMap, query: string) {
  if (!query) return true;
  const hay = [map.title, map.topic, map.creatorName, ...map.nodes.map((n) => n.title)]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function starPoint(index: number, total: number, slug: string) {
  const t = total <= 1 ? 0.5 : index / Math.max(total - 1, 1);
  const angle = Math.PI * (0.16 + 0.68 * t);
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const lift = ((h >>> 0) % 5) * 0.6;
  return {
    x: 50 + Math.cos(angle) * 42,
    y: 36 - Math.sin(angle) * 26 - lift,
  };
}

export function CommunityAtlas({
  signedIn,
  maps,
}: {
  signedIn: boolean;
  maps: PublicMap[];
}) {
  const dialog = useAuthDialog();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(maps[0]?.slug ?? null);
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => maps.filter((map) => matches(map, q)), [maps, q]);
  const focused = visible.some((map) => map.slug === active) ? active : (visible[0]?.slug ?? null);

  function focusMap(slug: string) {
    setActive(slug);
    document.getElementById(`map-${slug}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <nav className="sticky top-0 z-20 flex items-center justify-between bg-night-950/85 px-5 py-4 backdrop-blur-md lg:px-12">
        <Link href="/learn" className="flex items-center">
          <LearnLockup />
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/community" className="text-star-100">
            Community maps
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="text-star-400 hover:text-star-100">
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => dialog.open({ intent: "signin", next: "/community" })}
              className="rounded-full border border-night-800 px-5 py-2.5 text-star-100 hover:border-star-400"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <div className="sticky top-[3.65rem] z-10 border-b border-night-800 bg-night-950/90 backdrop-blur-md">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="mx-auto flex w-full max-w-[1200px] items-center px-5 py-3 lg:px-12"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search maps, topics, publishers, or stars"
            aria-label="Search maps, topics, publishers, or stars"
            className="w-full rounded-2xl border border-night-800 bg-night-900 px-5 py-3.5 text-lg text-star-100 outline-none placeholder:text-star-400 focus:border-aurora-400"
          />
        </form>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-5 pb-24 lg:px-12">
        <header className="pt-10 md:pt-14">
          <h1 className="max-w-[16ch] text-4xl font-bold tracking-tight md:text-6xl">
            Maps the community already walked.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-star-400">
            Search the hemisphere. Matching stars stay lit. Each plate is the real constellation:
            title, description, publisher, and the nodes themselves.
          </p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            {q
              ? `${visible.length} match${visible.length === 1 ? "" : "es"}`
              : `${maps.length} published constellation${maps.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {maps.length > 0 && (
          <svg
            viewBox="0 0 100 44"
            className="mt-8 h-[220px] w-full md:h-[260px]"
            role="img"
            aria-label="Hemisphere of published maps"
            preserveAspectRatio="xMidYMax meet"
          >
            <path
              d="M 6 38 A 44 30 0 0 1 94 38"
              fill="none"
              className="stroke-night-800"
              strokeWidth={0.45}
            />
            {maps.map((map, i) => {
              const p = starPoint(i, maps.length, map.slug);
              const on = visible.some((v) => v.slug === map.slug);
              const selected = focused === map.slug;
              return (
                <g
                  key={map.slug}
                  role="button"
                  tabIndex={on ? 0 : -1}
                  aria-label={map.title}
                  aria-pressed={selected}
                  className="cursor-pointer outline-none"
                  onClick={() => focusMap(map.slug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      focusMap(map.slug);
                    }
                  }}
                >
                  <circle cx={p.x} cy={p.y} r={6} fill="transparent" />
                  {selected && on && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={4.8}
                      className="stroke-aurora-400"
                      fill="none"
                      strokeWidth={0.35}
                      opacity={0.7}
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={selected && on ? 1.8 : 1.2 + Math.min(map.nodes.length, 12) * 0.05}
                    opacity={on ? 1 : 0.18}
                    className={on ? "fill-aurora-400" : "fill-star-400"}
                  />
                  {on && (
                    <text
                      x={p.x}
                      y={p.y - 3.4}
                      textAnchor="middle"
                      fontSize={2.3}
                      className="fill-star-100"
                      opacity={selected || visible.length <= 8 ? 0.95 : 0}
                    >
                      {map.title.length > 26 ? `${map.title.slice(0, 25)}…` : map.title}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {maps.length === 0 ? (
          <div className="mt-16 rounded-[1.75rem] border border-dashed border-night-800 p-12 text-center">
            <p className="text-star-400">No published maps yet. Be the first to share one.</p>
            <Link
              href={signedIn ? "/maps/new" : "/"}
              className="mt-6 inline-block rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
            >
              {signedIn ? "Create a map" : "Watch one build"}
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="mt-16 text-star-400">No maps match that. Try another word.</p>
        ) : (
          <ul className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {visible.map((map) => (
              <li key={map.slug}>
                <MapSkyCard
                  map={map}
                  signedIn={signedIn}
                  active={focused === map.slug}
                  onFocusMap={setActive}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-auto border-t border-night-800 px-5 py-8 lg:px-12">
        <UnseenEngineSponsor variant="footer" />
      </footer>
    </main>
  );
}
