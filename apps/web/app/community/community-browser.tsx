"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { useAuthDialog } from "@/app/components/auth-dialog";
import { UnseenEngineSponsor } from "@/app/components/unseen-engine-sponsor";
import { LearnNav } from "@/components/chrome/learn-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { BLOCK_TYPES, blockMeta, type BlockType } from "@/lib/blocks";
import { formatMinutes } from "@/lib/course-model";
import type { PublicMap } from "@/lib/public-maps";
import { cn } from "@/lib/utils";

import { CourseThumb } from "./course-thumb";

type Sort = "recent" | "lessons" | "short";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "lessons", label: "Most lessons" },
  { value: "short", label: "Shortest first" },
];

function sortMaps(maps: PublicMap[], sort: Sort) {
  const list = [...maps];
  switch (sort) {
    case "recent":
      return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case "lessons":
      return list.sort((a, b) => b.course.lessons - a.course.lessons);
    case "short":
      return list.sort((a, b) => a.course.minutes - b.course.minutes);
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

function matches(map: PublicMap, query: string, types: BlockType[]) {
  if (types.some((t) => !map.course.mix.some((m) => m.type === t))) return false;
  if (!query) return true;
  const hay = [map.title, map.topic, map.creatorName, ...map.course.cards.map((c) => c.title)].join(" ").toLowerCase();
  return query.split(/\s+/).every((word) => hay.includes(word));
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function updatedAgo(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days > -1) return "today";
  if (days > -30) return relative.format(days, "day");
  if (days > -365) return relative.format(Math.round(days / 30), "month");
  return relative.format(Math.round(days / 365), "year");
}

function courseLine(map: PublicMap) {
  const { modules, lessons, minutes } = map.course;
  const parts = [plural(modules.length, "module"), plural(lessons, "lesson")];
  if (minutes) parts.push(`about ${formatMinutes(minutes)}`);
  return parts.join(" · ");
}

function describes(map: PublicMap) {
  return map.topic.trim().toLowerCase() !== map.title.trim().toLowerCase() ? map.topic : null;
}

export function CommunityBrowser({ signedIn, maps }: { signedIn: boolean; maps: PublicMap[] }) {
  const router = useRouter();
  const dialog = useAuthDialog();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<BlockType[]>([]);
  const [sort, setSort] = useState<Sort>("recent");
  const [focus, setFocus] = useState<string | null>(maps[0]?.slug ?? null);
  const q = useDeferredValue(query.trim().toLowerCase());

  const available = useMemo(
    () => BLOCK_TYPES.filter((t) => maps.some((m) => m.course.mix.some((x) => x.type === t))),
    [maps],
  );
  const visible = useMemo(
    () => sortMaps(maps.filter((m) => matches(m, q, types)), sort),
    [maps, q, types, sort],
  );
  const focused = visible.find((m) => m.slug === focus) ?? visible[0] ?? null;
  const filtering = Boolean(q) || types.length > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || el?.closest("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function enter(map: PublicMap) {
    if (signedIn) router.push(`/maps/${map.slug}`);
    else dialog.open({ intent: "signin", next: `/maps/${map.slug}` });
  }

  function buildOwn() {
    const topic = query.trim();
    const next = topic ? `/maps/new?topic=${encodeURIComponent(topic)}` : "/maps/new";
    if (signedIn) router.push(next);
    else dialog.open({ intent: "signin", next });
  }

  function clear() {
    setQuery("");
    setTypes([]);
  }

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <LearnNav
        signedIn={signedIn}
        active="community"
        onSignIn={() => dialog.open({ intent: "signin", next: "/community" })}
      />

      <header className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 pt-8 pb-6 md:flex-row md:items-end md:justify-between lg:px-12 lg:pt-12">
        <div>
          <h1 className="max-w-[22ch] text-3xl font-bold tracking-tight text-balance md:text-5xl">
            Courses the community built, laid out as maps.
          </h1>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-star-400 md:text-lg">
            Every map is a full course: modules, lessons, videos, readings, and quizzes. See the
            whole path before you start. Previewing is free; entering saves your progress.
          </p>
        </div>
        <Button type="button" variant="outline" className="self-start md:self-auto" onClick={buildOwn}>
          Build your own map
        </Button>
      </header>

      <div className="sticky top-[3.65rem] z-10 border-y border-night-800 bg-night-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-5 py-3 lg:h-16 lg:flex-row lg:items-center lg:px-12 lg:py-0">
          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-star-400" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses, topics, lessons, or publishers"
              aria-label="Search courses, topics, lessons, or publishers"
              className="h-10 rounded-xl pr-10 pl-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-star-400 hover:bg-night-800 hover:text-star-100"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <Kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 lg:inline-flex">/</Kbd>
            )}
          </form>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {available.length > 1 ? (
              <div
                role="group"
                aria-label="Only courses with"
                className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]"
              >
                {available.map((type) => {
                  const meta = blockMeta(type);
                  const on = types.includes(type);
                  return (
                    <Toggle
                      key={type}
                      size="sm"
                      variant="outline"
                      pressed={on}
                      onPressedChange={(next) =>
                        setTypes((cur) => (next ? [...cur, type] : cur.filter((t) => t !== type)))
                      }
                      className="h-8 shrink-0 rounded-full border-night-800 px-3 text-star-400 hover:bg-night-900 hover:text-star-100 data-[state=on]:border-aurora-400/60 data-[state=on]:bg-aurora-400/10 data-[state=on]:text-star-100 data-[state=on]:[&_svg]:text-aurora-400"
                    >
                      <meta.icon />
                      {meta.label}
                    </Toggle>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger size="sm" aria-label="Sort courses" className="h-8 shrink-0 rounded-full border-night-800 px-3 text-star-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] flex-1 px-5 pt-6 pb-20 lg:px-12">
        {maps.length === 0 ? (
          <EmptyAtlas signedIn={signedIn} onBuild={buildOwn} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
            <section aria-label="Courses" className="min-w-0">
              <p className="mb-3 text-sm text-star-400 tabular-nums" aria-live="polite">
                {filtering ? `${visible.length} of ${plural(maps.length, "course")}` : plural(maps.length, "course")}
                {filtering ? (
                  <button type="button" onClick={clear} className="ml-3 text-star-100 underline underline-offset-4 hover:text-aurora-400">
                    Clear filters
                  </button>
                ) : null}
              </p>
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-night-800 p-6">
                  <p className="font-medium">
                    {q ? `No course covers “${query.trim()}” yet.` : "No course has all of those content types."}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-star-400">
                    Try fewer filters, or build the map yourself. The agent researches the topic and
                    drafts the modules for you to edit.
                  </p>
                  <div className="mt-4">
                    <Button type="button" size="sm" onClick={buildOwn}>
                      {q ? `Build a map about “${clipText(query.trim(), 24)}”` : "Build a map"}
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visible.map((map) => (
                    <li key={map.slug}>
                      <MapRow
                        map={map}
                        active={focused?.slug === map.slug}
                        onFocus={() => setFocus(map.slug)}
                        onEnter={() => enter(map)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside
              aria-label="Selected course"
              className="sticky top-[calc(3.65rem+4rem+1.5rem)] hidden h-[calc(100svh-3.65rem-4rem-3rem)] min-h-[34rem] lg:block"
            >
              {focused ? <MapPreview map={focused} onEnter={() => enter(focused)} /> : <PreviewEmpty />}
            </aside>
          </div>
        )}
      </div>

      <footer className="border-t border-night-800 px-5 py-8 lg:px-12">
        <UnseenEngineSponsor variant="footer" />
      </footer>
    </main>
  );
}

function clipText(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function MixIcons({ map, limit = 6 }: { map: PublicMap; limit?: number }) {
  const shown = map.course.mix.slice(0, limit);
  if (!shown.length) return null;
  return (
    <ul className="flex items-center gap-2" aria-label="Content types">
      {shown.map(({ type }) => {
        const meta = blockMeta(type);
        return (
          <li key={type} title={meta.label}>
            <meta.icon className="size-3.5 text-star-400" aria-hidden />
            <span className="sr-only">{meta.label}</span>
          </li>
        );
      })}
      {map.course.mix.length > limit ? (
        <li className="text-xs text-star-400">+{map.course.mix.length - limit}</li>
      ) : null}
    </ul>
  );
}

function MapRow({
  map,
  active,
  onFocus,
  onEnter,
}: {
  map: PublicMap;
  active: boolean;
  onFocus: () => void;
  onEnter: () => void;
}) {
  const about = describes(map);
  return (
    <article
      className={cn(
        "rounded-2xl border transition-colors duration-200",
        active
          ? "border-aurora-400/50 bg-night-900"
          : "border-night-800 bg-night-950 hover:border-night-800 hover:bg-night-900/60",
      )}
    >
      <button
        type="button"
        onClick={onFocus}
        onMouseEnter={onFocus}
        aria-pressed={active}
        className="block w-full rounded-2xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-aurora-400/60"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="aspect-[16/9] shrink-0 overflow-hidden rounded-xl border border-night-800 bg-night-950 bg-[radial-gradient(var(--night-800)_1px,transparent_1px)] [background-size:18px_18px] lg:aspect-[4/3] lg:w-24">
            <CourseThumb course={map.course} variant="glyph" className="h-full w-full p-3 lg:p-1.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 text-base leading-snug font-semibold text-pretty">{map.title}</h2>
              <span className="shrink-0 text-xs text-star-400">{updatedAgo(map.updatedAt)}</span>
            </div>
            {about ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-star-400">{about}</p> : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="text-xs text-star-400 tabular-nums">{courseLine(map)}</p>
              <MixIcons map={map} />
            </div>
            <p className="mt-2 text-xs text-star-400">
              by <span className="text-star-100">{map.creatorName}</span>
            </p>
          </div>
        </div>
      </button>
      <div className="flex gap-2 px-4 pb-4 lg:hidden">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/share/${map.slug}`}>Preview map</Link>
        </Button>
        <Button type="button" size="sm" className="flex-1" onClick={onEnter}>
          Enter map
        </Button>
      </div>
    </article>
  );
}

function MapPreview({ map, onEnter }: { map: PublicMap; onEnter: () => void }) {
  const reduce = useReducedMotion();
  const about = describes(map);
  const modules = map.course.modules;
  const shownModules = modules.slice(0, 5);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-night-800 bg-night-900/50">
      <div className="grid gap-6 border-b border-night-800 p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-pretty">{map.title}</h2>
          {about ? <p className="mt-2 line-clamp-2 max-w-[62ch] leading-relaxed text-star-400">{about}</p> : null}
          <p className="mt-3 text-sm text-star-400">
            Published by <span className="text-star-100">{map.creatorName}</span> · updated{" "}
            {updatedAgo(map.updatedAt)}
          </p>
          <p className="mt-1 text-sm text-star-400 tabular-nums">{courseLine(map)}</p>
          {map.course.mix.length ? (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="What's inside">
              {map.course.mix.map(({ type, count }) => {
                const meta = blockMeta(type);
                return (
                  <li
                    key={type}
                    className="inline-flex items-center gap-1.5 rounded-full border border-night-800 px-2.5 py-1 text-xs text-star-400"
                  >
                    <meta.icon className="size-3.5 text-aurora-400" aria-hidden />
                    {meta.label}
                    <span className="text-star-100 tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onEnter}>
              Enter map
            </Button>
            <Button asChild variant="outline">
              <Link href={`/share/${map.slug}`}>Preview free</Link>
            </Button>
          </div>
        </div>

        {modules.length ? (
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-star-100">Modules</h3>
            <ol className="mt-2 flex flex-col">
              {shownModules.map((m, i) => (
                <li key={m.id} className="flex items-baseline gap-3 border-b border-night-800/70 py-2 text-sm last:border-0">
                  <span className="w-4 shrink-0 text-xs text-star-400 tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{m.title}</span>
                  <span className="shrink-0 text-xs text-star-400 tabular-nums">
                    {m.lessons ? plural(m.lessons, "lesson") : "single lesson"}
                  </span>
                </li>
              ))}
            </ol>
            {modules.length > shownModules.length ? (
              <p className="mt-1 text-xs text-star-400">and {plural(modules.length - shownModules.length, "more module")}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <Link
        href={`/share/${map.slug}`}
        className="group relative block min-h-[18rem] flex-1 bg-night-950 bg-[radial-gradient(var(--night-800)_1.5px,transparent_1.5px)] [background-size:28px_28px] outline-none focus-visible:ring-2 focus-visible:ring-aurora-400/60 focus-visible:ring-inset"
        aria-label={`Open the full map of ${map.title}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={map.slug}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(8px)", scale: 0.985 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <CourseThumb course={map.course} className="h-full w-full p-6" />
          </motion.div>
        </AnimatePresence>
        <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-night-800 bg-night-900/90 px-3 py-1.5 text-xs text-star-400 transition-colors group-hover:border-star-400/40 group-hover:text-star-100">
          Open full map <ArrowUpRight className="size-3.5" />
        </span>
        <div className="pointer-events-none absolute bottom-4 left-4 flex gap-4 rounded-xl border border-night-800 bg-night-900/90 px-3 py-2 text-xs text-star-400">
          <span className="flex items-center gap-2">
            <span className="h-px w-5 bg-edge" /> part of
          </span>
          <span className="flex items-center gap-2">
            <span className="w-5 border-t border-dashed border-aurora-400" /> builds on
          </span>
        </div>
      </Link>
    </section>
  );
}

function PreviewEmpty() {
  return (
    <div className="grid h-full place-items-center rounded-3xl border border-dashed border-night-800 p-10 text-center text-star-400">
      Pick a course to see its map.
    </div>
  );
}

function EmptyAtlas({ signedIn, onBuild }: { signedIn: boolean; onBuild: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-night-800 p-10 text-center">
      <h2 className="text-xl font-semibold">No published maps yet.</h2>
      <p className="mt-3 leading-relaxed text-star-400">
        When someone publishes a course it shows up here as a map anyone can preview. Yours could be
        the first.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button type="button" onClick={onBuild}>
          {signedIn ? "Build a map" : "Sign in to build a map"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/learn">Watch one build</Link>
        </Button>
      </div>
    </div>
  );
}
