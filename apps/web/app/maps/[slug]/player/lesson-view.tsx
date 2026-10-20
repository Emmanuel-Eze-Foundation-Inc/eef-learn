"use client";

import { ArrowLeft, ArrowRight, CircleCheck, Clock, Lock, Network, SquarePen } from "lucide-react";
import Link from "next/link";

import { BlockView } from "@/components/learn/block-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { blockMeta, type BlockType } from "@/lib/blocks";
import { formatTime, lessonMinutes, optionalMinutes, type CourseLesson } from "@/lib/course-model";
import { cn } from "@/lib/utils";

function MapLink({
  lesson,
  onOpen,
  hint,
}: {
  lesson: CourseLesson;
  onOpen: (id: string) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(lesson.id)}
      className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] leading-snug text-star-100/90 hover:bg-night-800/60"
    >
      {lesson.state === "mastered" ? (
        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-gold-400" />
      ) : lesson.state === "locked" ? (
        <Lock className="mt-0.5 size-3.5 shrink-0 text-star-400" />
      ) : (
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-aurora-400" />
      )}
      <span className="min-w-0">
        {lesson.title}
        {hint ? <span className="block text-[11px] text-star-400">{hint}</span> : null}
      </span>
    </button>
  );
}

/** A block's name in the contents list: its title, else its first heading that isn't the lesson's. */
function blockLabel(block: CourseLesson["blocks"][number], lessonTitle: string, nth: number, ofType: number): string {
  const fresh = (text: string | null | undefined) => text && text.toLowerCase() !== lessonTitle.toLowerCase();
  if (fresh(block.title)) return block.title!;
  const label = blockMeta(block.type).label;
  if (block.type === "ai_text" && block.body) {
    const heading = block.body
      .split("\n")
      .map((line) => /^#{1,3}\s+(.+)$/.exec(line.trim())?.[1]?.trim())
      .find(fresh);
    if (heading) return heading;
  }
  return ofType > 1 ? `${label} ${nth}` : label;
}

function LessonRail({
  lesson,
  lessons,
  onOpen,
  onShowMap,
}: {
  lesson: CourseLesson;
  lessons: CourseLesson[];
  onOpen: (id: string) => void;
  onShowMap: () => void;
}) {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const needs = lesson.prereqIds.flatMap((id) => byId.get(id) ?? []);
  const unlocks = lessons.filter((l) => l.prereqIds.includes(lesson.id));
  const parent = lesson.parentId ? byId.get(lesson.parentId) : undefined;
  const children = lessons.filter((l) => l.parentId === lesson.id);

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 space-y-6">
        {lesson.blocks.length > 1 ? (
          <nav aria-label="In this lesson">
            <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">In this lesson</p>
            <ol className="space-y-0.5">
              {lesson.blocks.map((b, i) => {
                const meta = blockMeta(b.type);
                const Icon = meta.icon;
                return (
                  <li key={b.id}>
                    <a
                      href={`#block-${b.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-star-400 hover:bg-night-800/60 hover:text-star-100"
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {blockLabel(
                          b,
                          lesson.title,
                          lesson.blocks.slice(0, i + 1).filter((x) => x.type === b.type).length,
                          lesson.blocks.filter((x) => x.type === b.type).length,
                        )}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className="rounded-2xl border border-night-800 bg-night-900/60 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">On the map</p>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onShowMap}>
              <Network className="size-3.5" />
              Full map
            </Button>
          </div>
          {parent ? (
            <div className="mb-2">
              <p className="px-2 text-[11px] text-star-400">Part of</p>
              <MapLink lesson={parent} onOpen={onOpen} />
            </div>
          ) : null}
          {needs.length ? (
            <div className="mb-2">
              <p className="px-2 text-[11px] text-star-400">Builds on</p>
              {needs.map((l) => (
                <MapLink key={l.id} lesson={l} onOpen={onOpen} />
              ))}
            </div>
          ) : null}
          {children.length ? (
            <div className="mb-2">
              <p className="px-2 text-[11px] text-star-400">Goes deeper</p>
              {children.map((l) => (
                <MapLink key={l.id} lesson={l} onOpen={onOpen} />
              ))}
            </div>
          ) : null}
          {unlocks.length ? (
            <div>
              <p className="px-2 text-[11px] text-star-400">Unlocks</p>
              {unlocks.map((l) => (
                <MapLink key={l.id} lesson={l} onOpen={onOpen} />
              ))}
            </div>
          ) : null}
          {!parent && !needs.length && !children.length && !unlocks.length ? (
            <p className="px-2 pb-1 text-[13px] text-star-400">A standalone stop on this map.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function LockedPanel({
  lesson,
  lessons,
  onOpen,
}: {
  lesson: CourseLesson;
  lessons: CourseLesson[];
  onOpen: (id: string) => void;
}) {
  const needs = lessons.filter((l) => lesson.prereqIds.includes(l.id) && l.state !== "mastered");
  return (
    <div className="rounded-2xl border border-night-800 bg-night-900/60 p-8">
      <Lock className="size-5 text-star-400" />
      <h2 className="mt-4 text-xl font-semibold">Finish what this builds on first</h2>
      <p className="mt-2 max-w-prose text-star-400">
        This lesson opens once you complete the lessons below. Each one is a step on the map toward it.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {needs.map((l) => (
          <Button key={l.id} type="button" variant="secondary" onClick={() => onOpen(l.id)}>
            {l.title}
            <ArrowRight className="size-4" />
          </Button>
        ))}
      </div>
    </div>
  );
}

export function LessonView({
  lesson,
  lessons,
  moduleLabel,
  slug,
  isCreator,
  completing,
  onOpen,
  onComplete,
  onShowMap,
}: {
  lesson: CourseLesson;
  lessons: CourseLesson[];
  moduleLabel: string | null;
  slug: string;
  isCreator: boolean;
  completing: boolean;
  onOpen: (id: string) => void;
  onComplete: () => void;
  onShowMap: () => void;
}) {
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;
  const locked = lesson.state === "locked" && !isCreator;
  const kinds = [...new Set(lesson.blocks.map((b) => b.type))] as BlockType[];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pt-10 pb-24 md:px-10 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <article className="min-w-0">
        <header className="mb-10">
          <p className="font-mono text-[11px] tracking-[0.14em] text-star-400 uppercase">
            {moduleLabel ?? "Lesson"} · {index + 1} of {lessons.length}
          </p>
          <h1 className="mt-3 text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.1] font-bold tracking-tight text-balance">
            {lesson.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {lesson.blocks.length ? (
              <Badge className="gap-1.5">
                <Clock className="size-3" />
                {formatTime(lessonMinutes(lesson), optionalMinutes(lesson))}
              </Badge>
            ) : null}
            {kinds.map((k) => {
              const meta = blockMeta(k);
              const Icon = meta.icon;
              return (
                <Badge key={k} className="gap-1.5">
                  <Icon className="size-3" />
                  {meta.label}
                </Badge>
              );
            })}
            {lesson.state === "mastered" ? (
              <Badge variant="gold" className="gap-1.5">
                <CircleCheck className="size-3" />
                Completed
              </Badge>
            ) : null}
          </div>
        </header>

        {locked ? (
          <LockedPanel lesson={lesson} lessons={lessons} onOpen={onOpen} />
        ) : lesson.blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-night-800 p-10 text-center">
            <p className="text-lg font-semibold">This lesson has no content yet.</p>
            <p className="mx-auto mt-2 max-w-md text-star-400">
              {isCreator
                ? "Open the studio and ask the course agent to write it — reading, video, a quiz, whatever it needs."
                : "The creator is still building this one. Continue to the next lesson."}
            </p>
            {isCreator ? (
              <Button asChild className="mt-6">
                <Link href={`/maps/${slug}/studio?lesson=${lesson.slug}`}>
                  <SquarePen className="size-4" />
                  Build it with the agent
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <TracingBeam className="md:pl-6">
            <div className="space-y-12">
              {lesson.blocks.map((block, i) => (
                <div key={block.id}>
                  {i > 0 ? <Separator className="mb-12 bg-night-800/70" /> : null}
                  <BlockView block={block} index={i} lessonTitle={lesson.title} />
                </div>
              ))}
            </div>
          </TracingBeam>
        )}

        {!locked ? (
          <div className="mt-16 rounded-2xl border border-night-800 bg-night-900/60 p-5 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className="font-semibold">
                {lesson.state === "mastered" ? "You've completed this lesson." : "Done with this lesson?"}
              </p>
              <p className="mt-1 text-sm text-star-400">
                {next ? `Up next: ${next.title}` : "This is the last lesson on the map."}
              </p>
            </div>
            <div className="mt-4 flex shrink-0 gap-2 md:mt-0">
              {lesson.state === "mastered" ? (
                next ? (
                  <Button type="button" onClick={() => onOpen(next.id)}>
                    Next lesson
                    <ArrowRight className="size-4" />
                  </Button>
                ) : null
              ) : (
                <Button type="button" onClick={onComplete} disabled={completing}>
                  {completing ? "Saving…" : next ? "Complete & continue" : "Complete the map"}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Lesson navigation">
          {prev ? (
            <button
              type="button"
              onClick={() => onOpen(prev.id)}
              className="group rounded-2xl border border-night-800 p-4 text-left transition-colors hover:border-star-400/60"
            >
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-star-400 uppercase">
                <ArrowLeft className="size-3" /> Previous
              </span>
              <span className="mt-1.5 block font-medium text-star-100">{prev.title}</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button
              type="button"
              onClick={() => onOpen(next.id)}
              className={cn(
                "group rounded-2xl border border-night-800 p-4 text-right transition-colors hover:border-star-400/60",
                next.state === "locked" && !isCreator && "opacity-70",
              )}
            >
              <span className="flex items-center justify-end gap-1.5 font-mono text-[10px] tracking-[0.12em] text-star-400 uppercase">
                {next.state === "locked" && !isCreator ? <Lock className="size-3" /> : null}
                Next <ArrowRight className="size-3" />
              </span>
              <span className="mt-1.5 block font-medium text-star-100">{next.title}</span>
            </button>
          ) : null}
        </nav>
      </article>

      <LessonRail lesson={lesson} lessons={lessons} onOpen={onOpen} onShowMap={onShowMap} />
    </div>
  );
}
