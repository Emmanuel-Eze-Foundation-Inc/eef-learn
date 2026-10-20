"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, ArrowRight, Clock, Flag, GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useResolvedTheme } from "@/hooks/use-theme";
import { useAuthDialog } from "@/app/components/auth-dialog";
import { LearnNav } from "@/components/chrome/learn-nav";
import { Button } from "@/components/ui/button";
import { blockMeta, type BlockType } from "@/lib/blocks";
import { formatMinutes } from "@/lib/course-model";
import { cn } from "@/lib/utils";

export type ShareLesson = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  x: number;
  y: number;
  role: "intro" | "module" | "lesson";
  moduleIndex: number | null;
  minutes: number;
  blocks: { id: string; type: BlockType; title: string | null }[];
  buildsOn: string[];
};

type Marker = "start" | "finish" | null;
type ShareNodeData = { lesson: ShareLesson; marker: Marker; active: boolean };
type ShareFlowNode = Node<ShareNodeData, "lesson">;

const CARD_W = 240;
const PANEL = 352;

function kindLabel(lesson: ShareLesson) {
  if (lesson.moduleIndex !== null) return `Module ${lesson.moduleIndex + 1}`;
  if (lesson.role === "intro") return "Introduction";
  return "Lesson";
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function ShareNode({ data }: NodeProps<ShareFlowNode>) {
  const { lesson, marker, active } = data;
  const lead = lesson.blocks[0];
  const Icon = lead ? blockMeta(lead.type).icon : null;
  const head = lesson.role !== "lesson";
  return (
    <div
      className={cn(
        "relative w-60 cursor-pointer rounded-2xl border px-4 py-3 text-left shadow-[0_8px_30px_var(--shadow-soft)] transition-[border-color,box-shadow] duration-200",
        head ? "bg-night-850" : "bg-night-900",
        active
          ? "border-aurora-400 ring-4 ring-aurora-400/15"
          : head
            ? "border-aurora-400/40 hover:border-aurora-400/70"
            : "border-night-800 hover:border-star-400/50",
      )}
    >
      {marker ? (
        <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full border border-gold-400/60 bg-night-950 px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-gold-400 uppercase">
          {marker === "finish" ? <Flag className="size-3" /> : null}
          {marker}
        </span>
      ) : null}
      <Handle id="in" type="target" position={Position.Left} className="!border-0 !bg-transparent" />
      <Handle id="spine" type="source" position={Position.Left} className="!border-0 !bg-transparent" />
      <div className="flex items-center gap-2 text-[11px] text-star-400">
        {Icon ? <Icon className={cn("size-3.5", head ? "text-aurora-400" : "text-star-400")} /> : null}
        <span className={head ? "font-medium text-aurora-400" : undefined}>{kindLabel(lesson)}</span>
        {lesson.minutes ? <span className="ml-auto tabular-nums">{lesson.minutes} min</span> : null}
      </div>
      <p className={cn("mt-1 line-clamp-2 text-sm leading-snug text-star-100", head ? "font-semibold" : "font-medium")}>
        {lesson.title}
      </p>
      <Handle id="out" type="source" position={Position.Right} className="!border-0 !bg-transparent" />
    </div>
  );
}

const nodeTypes = { lesson: ShareNode };

type Props = {
  slug: string;
  title: string;
  topic: string;
  publisher: string;
  signedIn: boolean;
  lessons: ShareLesson[];
  prerequisites: { fromId: string; toId: string }[];
  modules: { id: string; lessonIds: string[] }[];
  introId: string | null;
};

/** Public preview: the whole course as a map. Pick a lesson, then enter there. */
export function SharePreview(props: Props) {
  return (
    <ReactFlowProvider>
      <ShareInner {...props} />
    </ReactFlowProvider>
  );
}

function ShareInner({ slug, title, topic, publisher, signedIn, lessons, prerequisites, modules, introId }: Props) {
  const colorMode = useResolvedTheme();
  const router = useRouter();
  const dialog = useAuthDialog();
  const { fitView, setCenter, getZoom } = useReactFlow();
  const [selectedId, setSelectedId] = useState(lessons[0]!.id);
  const selected = lessons.find((l) => l.id === selectedId) ?? lessons[0]!;
  const index = lessons.findIndex((l) => l.id === selected.id);
  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);

  const nodes = useMemo<ShareFlowNode[]>(
    () =>
      lessons.map((lesson, i) => ({
        id: lesson.id,
        type: "lesson",
        position: { x: lesson.x, y: lesson.y },
        data: {
          lesson,
          active: lesson.id === selectedId,
          marker: i === 0 ? "start" : i === lessons.length - 1 ? "finish" : null,
        },
        draggable: false,
        connectable: false,
        selectable: false,
      })),
    [lessons, selectedId],
  );

  const edges = useMemo<Edge[]>(() => {
    const travel = new Map(lessons.map((l, i) => [l.id, i]));
    return [
      ...lessons
        .filter((l) => l.parentId && byId.has(l.parentId))
        .map((l) => ({
          id: `c:${l.parentId}->${l.id}`,
          source: l.parentId!,
          sourceHandle: "spine",
          target: l.id,
          targetHandle: "in",
          type: "smoothstep",
          pathOptions: { offset: 18, borderRadius: 10 },
          style: { stroke: "var(--edge)", strokeWidth: 1.5 },
        })),
      ...prerequisites
        .filter((e) => {
          const from = byId.get(e.fromId);
          const to = byId.get(e.toId);
          if (!from || !to) return false;
          return to.x >= from.x + CARD_W && travel.get(to.id) !== (travel.get(from.id) ?? -2) + 1;
        })
        .map((e) => ({
          id: `p:${e.fromId}->${e.toId}`,
          source: e.fromId,
          sourceHandle: "out",
          target: e.toId,
          targetHandle: "in",
          type: "smoothstep",
          animated: true,
          style: { stroke: "var(--aurora-400)", strokeDasharray: "6 5", strokeWidth: 1.25, opacity: 0.7 },
        })),
    ];
  }, [lessons, prerequisites, byId]);

  const frame = useCallback(() => {
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    void fitView({
      maxZoom: 1,
      padding: wide
        ? { top: "48px", bottom: "48px", left: `${PANEL + 32}px`, right: `${PANEL + 32}px` }
        : { top: "72px", bottom: "260px", left: "24px", right: "24px" },
    });
  }, [fitView]);

  const focus = useCallback(
    (id: string) => {
      setSelectedId(id);
      const lesson = byId.get(id);
      if (lesson) void setCenter(lesson.x + CARD_W / 2, lesson.y + 40, { zoom: Math.max(getZoom(), 0.7), duration: 320 });
    },
    [byId, getZoom, setCenter],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable=true]")) return;
      const i = lessons.findIndex((l) => l.id === selectedId);
      if (e.key === "ArrowRight" && i < lessons.length - 1) focus(lessons[i + 1]!.id);
      if (e.key === "ArrowLeft" && i > 0) focus(lessons[i - 1]!.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, lessons, selectedId]);

  function enter(lesson: ShareLesson | null) {
    const href = lesson ? `/maps/${slug}?node=${encodeURIComponent(lesson.slug)}` : `/maps/${slug}`;
    if (signedIn) router.push(href);
    else dialog.open({ intent: "signin", next: href });
  }

  const totalMinutes = lessons.reduce((sum, l) => sum + l.minutes, 0);
  const mix = useMemo(() => {
    const counts = new Map<BlockType, number>();
    for (const l of lessons) for (const b of l.blocks) counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [lessons]);
  const intro = introId ? byId.get(introId) : null;
  const about = topic.trim().toLowerCase() !== title.trim().toLowerCase() ? topic : null;

  return (
    <main className="flex h-svh flex-col bg-night-950 text-star-100">
      <LearnNav
        signedIn={signedIn}
        onSignIn={() => dialog.open({ intent: "signin", next: `/share/${slug}` })}
        className="border-b border-night-800 bg-night-950"
      />

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={frame}
          minZoom={0.2}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          proOptions={{ hideAttribution: true }}
          panOnScroll
          zoomOnPinch
          colorMode={colorMode}
          className="!bg-night-950"
        >
          <Background color="var(--night-800)" gap={28} size={1.5} />
          <Controls
            showInteractive={false}
            onFitView={frame}
            position="bottom-right"
            className="!mb-4 max-lg:!mb-[15.5rem]"
          />
        </ReactFlow>

        <aside
          aria-label="Course"
          className="absolute top-4 bottom-4 left-4 hidden w-[22rem] flex-col overflow-hidden rounded-2xl border border-night-800 bg-night-900/95 shadow-[0_16px_48px_var(--shadow-strong)] backdrop-blur lg:flex"
        >
          <div className="border-b border-night-800 p-5">
            <h1 className="text-xl font-semibold tracking-tight text-pretty">{title}</h1>
            {about ? <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-star-400">{about}</p> : null}
            <p className="mt-3 text-xs text-star-400">
              Published by <span className="text-star-100">{publisher}</span>
            </p>
            <p className="mt-1 text-xs text-star-400 tabular-nums">
              {plural(modules.length, "module")} · {plural(lessons.length, "lesson")}
              {totalMinutes ? ` · about ${formatMinutes(totalMinutes)}` : ""}
            </p>
            {mix.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What's inside">
                {mix.map(([type, count]) => {
                  const meta = blockMeta(type);
                  return (
                    <li key={type} className="inline-flex items-center gap-1.5 rounded-full border border-night-800 px-2 py-0.5 text-[11px] text-star-400">
                      <meta.icon className="size-3 text-aurora-400" aria-hidden />
                      {meta.label}
                      <span className="text-star-100 tabular-nums">{count}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Outline" className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-color:var(--night-800)_transparent]">
            {intro ? <OutlineItem lesson={intro} active={selected.id === intro.id} onPick={focus} /> : null}
            {modules.map((m) => {
              const head = byId.get(m.id);
              if (!head) return null;
              return (
                <div key={m.id} className="mt-1">
                  <OutlineItem lesson={head} active={selected.id === head.id} onPick={focus} />
                  {m.lessonIds.map((id) => {
                    const lesson = byId.get(id);
                    return lesson ? (
                      <OutlineItem key={id} lesson={lesson} active={selected.id === id} onPick={focus} nested />
                    ) : null;
                  })}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-night-800 p-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => enter(null)}>
              Start from the beginning
            </Button>
          </div>
        </aside>

        <div className="absolute top-3 right-3 left-3 rounded-xl border border-night-800 bg-night-900/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="text-xs text-star-400 tabular-nums">
            {plural(lessons.length, "lesson")} · by {publisher}
          </p>
        </div>

        <section
          aria-label="Selected lesson"
          aria-live="polite"
          className="absolute right-3 bottom-3 left-3 rounded-2xl border border-night-800 bg-night-900/95 p-5 shadow-[0_16px_48px_var(--shadow-strong)] backdrop-blur lg:top-4 lg:right-4 lg:bottom-auto lg:left-auto lg:w-[22rem]"
        >
          <div className="flex items-center gap-2 text-xs text-star-400">
            {index === 0 ? <span className="font-semibold tracking-[0.1em] text-gold-400 uppercase">Start</span> : null}
            {index === lessons.length - 1 && index > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold tracking-[0.1em] text-gold-400 uppercase">
                <Flag className="size-3" /> Finish
              </span>
            ) : null}
            <span>{kindLabel(selected)}</span>
            <span className="ml-auto tabular-nums">
              {index + 1} of {lessons.length}
            </span>
          </div>
          <h2 className="mt-2 text-lg leading-snug font-semibold text-pretty">{selected.title}</h2>
          {selected.minutes ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-star-400">
              <Clock className="size-3.5" /> about {formatMinutes(selected.minutes)}
            </p>
          ) : null}

          {selected.blocks.length ? (
            <ul className="mt-4 hidden flex-col gap-1.5 sm:flex" aria-label="In this lesson">
              {selected.blocks.slice(0, 5).map((b) => {
                const meta = blockMeta(b.type);
                return (
                  <li key={b.id} className="flex items-center gap-2.5 text-sm">
                    <meta.icon className="size-4 shrink-0 text-aurora-400" aria-hidden />
                    <span className="text-star-400">{meta.verb}</span>
                    <span className="min-w-0 truncate">{b.title || meta.label}</span>
                  </li>
                );
              })}
              {selected.blocks.length > 5 ? (
                <li className="pl-6.5 text-xs text-star-400">and {selected.blocks.length - 5} more</li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-4 hidden text-sm text-star-400 sm:block">This stop has no content yet.</p>
          )}

          {selected.buildsOn.length ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-star-400">
              <GitBranch className="mt-0.5 size-3.5 shrink-0" />
              <span>Builds on {selected.buildsOn.join(", ")}</span>
            </p>
          ) : null}

          <div className="mt-5 flex items-center gap-2">
            <Button type="button" className="flex-1" onClick={() => enter(selected)}>
              {index === 0 ? "Enter map" : "Enter at this lesson"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous lesson"
              disabled={index === 0}
              onClick={() => focus(lessons[index - 1]!.id)}
            >
              <ArrowLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next lesson"
              disabled={index === lessons.length - 1}
              onClick={() => focus(lessons[index + 1]!.id)}
            >
              <ArrowRight />
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-star-400">
            {signedIn ? (
              "Your progress saves as you go."
            ) : (
              <>
                Previewing is free. Entering asks you to sign in so your progress saves.{" "}
                <Link href="/community" className="text-star-100 underline underline-offset-4 hover:text-aurora-400">
                  More maps
                </Link>
              </>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}

function OutlineItem({
  lesson,
  active,
  onPick,
  nested = false,
}: {
  lesson: ShareLesson;
  active: boolean;
  onPick: (id: string) => void;
  nested?: boolean;
}) {
  const lead = lesson.blocks[0];
  const Icon = lead ? blockMeta(lead.type).icon : null;
  return (
    <button
      type="button"
      onClick={() => onPick(lesson.id)}
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-aurora-400/60",
        nested ? "pl-8" : "font-medium",
        active ? "bg-night-800 text-star-100" : "text-star-400 hover:bg-night-800/60 hover:text-star-100",
      )}
    >
      {Icon ? (
        <Icon className={cn("size-3.5 shrink-0", active || !nested ? "text-aurora-400" : "text-star-400")} aria-hidden />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {lesson.moduleIndex !== null ? <span className="mr-1.5 text-star-400 tabular-nums">{lesson.moduleIndex + 1}</span> : null}
        {lesson.title}
      </span>
      {lesson.minutes ? <span className="shrink-0 text-xs text-star-400 tabular-nums">{lesson.minutes}m</span> : null}
    </button>
  );
}
