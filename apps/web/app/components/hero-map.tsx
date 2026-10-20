"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { blockMeta } from "@/lib/blocks";
import { formatMinutes } from "@/lib/course-model";
import type { PublicMap } from "@/lib/public-maps";
import { cn } from "@/lib/utils";

import { CourseThumb } from "../community/course-thumb";
import { EnterMapButton } from "./enter-map-button";

const CYCLE_MS = 9000;
const HERO_FRAME = { w: 880, h: 600 };

/** A real published course, drawn as its map, cycling through a few community maps. */
export function HeroMap({ maps, signedIn }: { maps: PublicMap[]; signedIn: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const map = maps[index % maps.length];

  useEffect(() => {
    if (paused || maps.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % maps.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, maps.length]);

  if (!map) return null;
  const { course } = map;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <figure className="overflow-hidden rounded-3xl border border-star-100/10 bg-night-950/75 shadow-[0_30px_120px_-40px_rgba(52,217,140,0.25)] backdrop-blur-md">
        <figcaption className="flex items-start justify-between gap-4 border-b border-night-800 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{map.title}</p>
            <p className="mt-0.5 truncate text-sm text-star-400">by {map.creatorName}</p>
          </div>
          <p className="shrink-0 text-sm text-star-400 tabular-nums">
            {course.lessons} lessons{course.minutes ? ` · ${formatMinutes(course.minutes)}` : ""}
          </p>
        </figcaption>

        <div className="relative aspect-[4/3] w-full px-3 py-4 sm:aspect-[16/11]">
          <CourseThumb key={map.slug} course={course} animate minFrame={HERO_FRAME} className="size-full" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-night-800 px-5 py-3.5">
          <ul className="flex min-w-0 flex-wrap gap-1.5" aria-label="Content in this map">
            {course.mix.slice(0, 4).map(({ type }) => {
              const meta = blockMeta(type);
              const Icon = meta.icon;
              return (
                <li
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full border border-night-800 px-2.5 py-1 text-xs text-star-400"
                >
                  <Icon className="size-3.5 text-aurora-400" aria-hidden />
                  {meta.label}
                </li>
              );
            })}
          </ul>
          <div className="flex shrink-0 gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/share/${map.slug}`}>Preview</Link>
            </Button>
            <EnterMapButton
              slug={map.slug}
              signedIn={signedIn}
              className="inline-flex h-8 items-center rounded-md bg-aurora-400 px-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-aurora-400/90"
            />
          </div>
        </div>
      </figure>

      {maps.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-1" role="group" aria-label="Featured community maps">
          {maps.map((m, i) => (
            <button
              key={m.slug}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${m.title}`}
              aria-pressed={i === index}
              className="group grid h-6 place-items-center px-1"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-[width,background-color] duration-300",
                  i === index ? "w-6 bg-aurora-400" : "w-1.5 bg-star-400/40 group-hover:bg-star-400",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
