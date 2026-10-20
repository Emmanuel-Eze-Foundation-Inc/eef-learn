"use client";

import { Check, Globe, Lock, Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { blockMeta, type BlockType } from "@/lib/blocks";
import { cn } from "@/lib/utils";

export type SceneMap = { title: string; creatorName: string; lessons: number };

const FALLBACK_MAPS: SceneMap[] = [
  { title: "Linear algebra", creatorName: "Demo Learner", lessons: 5 },
  { title: "AI engineering", creatorName: "Map Maker", lessons: 10 },
  { title: "Agentic workflows", creatorName: "Map Maker", lessons: 6 },
];

function arrive(i: number): CSSProperties {
  return { animation: "arrive 360ms var(--ease-out) both", animationDelay: `${120 + i * 110}ms` };
}

function Shell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="relative flex h-[27rem] flex-col gap-3 overflow-hidden rounded-3xl border border-night-800 bg-night-900/70 p-5 shadow-[0_24px_80px_-32px_var(--shadow-strong)] backdrop-blur-sm"
    >
      {children}
    </div>
  );
}

function BlockRow({ type, title, source, i }: { type: BlockType; title: string; source: string; i: number }) {
  const meta = blockMeta(type);
  const Icon = meta.icon;
  return (
    <div style={arrive(i)} className="flex items-center gap-3 rounded-xl border border-night-800 bg-night-950/70 px-3 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-night-800 text-aurora-400">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-star-400">
          {meta.label} · {source}
        </p>
      </div>
    </div>
  );
}

function PickScene({ maps }: { maps: SceneMap[] }) {
  return (
    <Shell label="Typing a topic, or choosing a published community map">
      <div style={arrive(0)} className="flex h-12 items-center rounded-full border border-aurora-400/50 bg-night-950 pr-1.5 pl-5">
        <span className="flex-1 truncate text-sm">
          Linear algebra for machine learning
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-aurora-400 motion-safe:animate-pulse" />
        </span>
        <span className="rounded-full bg-aurora-400 px-4 py-2 text-xs font-semibold text-ink-900">Watch it build</span>
      </div>
      <p style={arrive(1)} className="mt-3 text-sm text-star-400">
        Or open one people already travel
      </p>
      {maps.slice(0, 3).map((map, i) => (
        <div
          key={map.title + i}
          style={arrive(i + 2)}
          className="flex items-center justify-between gap-3 rounded-xl border border-night-800 bg-night-950/70 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{map.title}</p>
            <p className="truncate text-xs text-star-400">
              by {map.creatorName} · {map.lessons} lessons
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-night-800 px-3 py-1 text-xs text-star-400">Preview</span>
        </div>
      ))}
    </Shell>
  );
}

const SOURCES = ["3blue1brown.com", "ocw.mit.edu", "khanacademy.org"];
const MODULES = ["Vectors and spaces", "Matrices as transformations", "Eigenvalues and eigenvectors", "Linear algebra in ML"];

function DraftScene() {
  return (
    <Shell label="The course agent researching sources, then drafting the modules">
      <div style={arrive(0)} className="flex items-center gap-2 text-sm text-star-400">
        <Search className="size-4 text-aurora-400" aria-hidden />
        Researching linear algebra on the web
      </div>
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((host, i) => (
          <span
            key={host}
            style={arrive(i + 1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-night-800 bg-night-950/70 px-3 py-1 text-xs"
          >
            <Check className="size-3 text-aurora-400" aria-hidden />
            {host}
          </span>
        ))}
      </div>
      <p style={arrive(4)} className="mt-3 text-sm font-semibold">
        Modules first
      </p>
      <ol className="flex flex-col gap-2">
        {MODULES.map((title, i) => (
          <li
            key={title}
            style={arrive(i + 5)}
            className="flex items-center gap-3 rounded-xl border border-aurora-400/30 bg-night-850 px-4 py-2.5 text-sm"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-night-950 text-xs font-semibold text-aurora-400 tabular-nums">
              {i + 1}
            </span>
            <span className="truncate font-medium">{title}</span>
          </li>
        ))}
      </ol>
    </Shell>
  );
}

function FillScene() {
  return (
    <Shell label="One lesson filled with a video, reading, code, a quiz and a flashcard, each with its source">
      <div style={arrive(0)}>
        <p className="text-xs text-star-400">Module 2</p>
        <p className="font-semibold">Matrices as transformations</p>
      </div>
      <BlockRow i={1} type="youtube" title="Linear transformations and matrices" source="3Blue1Brown" />
      <BlockRow i={2} type="ai_text" title="What a matrix does to space" source="written from MIT 18.06 notes" />
      <BlockRow i={3} type="code" title="Rotate a vector with NumPy" source="numpy.org" />
      <BlockRow i={4} type="quiz" title="Which matrix scales by 2?" source="from the reading" />
      <BlockRow i={5} type="flashcard" title="Determinant, in one line" source="from the video" />
    </Shell>
  );
}

/** positions are % of the canvas; cards are 44% wide and ~13% tall */
const NODES = [
  { id: "m", x: 5, y: 5, title: "Matrices", type: "ai_text" as const, head: true },
  { id: "a", x: 38, y: 25, title: "Transformations", type: "youtube" as const },
  { id: "b", x: 38, y: 43, title: "Rotate in NumPy", type: "code" as const },
  { id: "c", x: 38, y: 61, title: "Check yourself", type: "quiz" as const },
  { id: "e", x: 5, y: 80, title: "Eigenvalues", type: "ai_text" as const, head: true },
];

function StudioScene() {
  return (
    <Shell label="The course studio in Map mode: a module with nested lessons and a prerequisite link">
      <div style={arrive(0)} className="flex w-fit gap-1 rounded-full border border-night-800 bg-night-950 p-1 text-xs">
        {["Chat", "Map", "Document"].map((mode) => (
          <span
            key={mode}
            className={cn("rounded-full px-3 py-1", mode === "Map" ? "bg-night-800 font-semibold text-star-100" : "text-star-400")}
          >
            {mode}
          </span>
        ))}
      </div>
      <div className="relative flex-1 rounded-2xl border border-night-800 bg-night-950/70 bg-[radial-gradient(circle,color-mix(in_oklab,var(--star-100)_9%,transparent)_1px,transparent_1px)] [background-size:18px_18px]">
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <g fill="none" strokeWidth={2} style={arrive(2)}>
            {[31.5, 49.5, 67.5].map((y) => (
              <path key={y} d={`M14 18 V${y} H38`} className="stroke-edge" vectorEffect="non-scaling-stroke" />
            ))}
            <path
              d="M60 74 V86.5 H49"
              className="stroke-aurora-400"
              strokeDasharray="5 5"
              opacity={0.7}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
        {NODES.map((node, i) => {
          const Icon = blockMeta(node.type).icon;
          return (
            <div
              key={node.id}
              style={{ ...arrive(i + 1), left: `${node.x}%`, top: `${node.y}%` }}
              className={cn(
                "absolute flex w-[44%] items-center gap-2 rounded-xl border px-2.5 py-2 text-xs",
                node.head ? "border-aurora-400/45 bg-night-850 font-semibold" : "border-night-800 bg-night-900",
                node.id === "b" && "ring-2 ring-gold-400/70",
              )}
            >
              <Icon className={cn("size-3.5 shrink-0", node.head ? "text-aurora-400" : "text-star-400")} aria-hidden />
              <span className="truncate">{node.title}</span>
            </div>
          );
        })}
      </div>
      <p style={arrive(6)} className="text-xs text-star-400">
Drag to nest a lesson under a module. Dashed lines mark what has to come first.
      </p>
    </Shell>
  );
}

const PATH = [
  { title: "Vectors and spaces", state: "done" },
  { title: "Matrices as transformations", state: "here" },
  { title: "Eigenvalues and eigenvectors", state: "next" },
] as const;

function PublishScene() {
  return (
    <Shell label="Choosing public or private, approving a request, then learning one lesson at a time">
      <div style={arrive(0)} className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 rounded-xl border border-night-800 bg-night-950/70 px-3 py-2.5 text-star-400">
          <Globe className="size-4" aria-hidden /> Public, in Community
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-aurora-400/50 bg-night-950/70 px-3 py-2.5">
          <Lock className="size-4 text-gold-400" aria-hidden /> Private, by request
        </div>
      </div>
      <div style={arrive(1)} className="flex items-center gap-3 rounded-xl border border-night-800 bg-night-950/70 px-3 py-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-night-800 text-xs">AT</span>
        <p className="min-w-0 flex-1 truncate text-xs">
          <span className="font-medium">Ada</span> <span className="text-star-400">asked to join</span>
        </p>
        <span className="rounded-full bg-aurora-400 px-3 py-1 text-xs font-semibold text-ink-900">Approve</span>
      </div>
      <div style={arrive(2)} className="mt-2 flex-1 rounded-2xl border border-night-800 bg-night-950/70 p-4">
        <div className="flex items-center justify-between text-xs text-star-400">
          <span>Linear algebra</span>
          <span className="tabular-nums">4 of 12 lessons</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-800">
          <div className="h-full w-1/3 rounded-full bg-aurora-400" />
        </div>
        <ol className="mt-4 flex flex-col gap-2">
          {PATH.map((lesson, i) => (
            <li
              key={lesson.title}
              style={arrive(i + 3)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                lesson.state === "here" ? "bg-night-800 font-semibold" : "text-star-400",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border",
                  lesson.state === "done" && "border-gold-400 bg-gold-400 text-ink-900",
                  lesson.state === "here" && "border-aurora-400",
                  lesson.state === "next" && "border-dashed border-star-400",
                )}
              >
                {lesson.state === "done" ? <Check className="size-3" aria-hidden /> : null}
              </span>
              <span className="truncate">{lesson.title}</span>
            </li>
          ))}
        </ol>
      </div>
    </Shell>
  );
}

/** Illustrations for each how-it-works step. Re-key on step so the arrival replays. */
export function LearnScene({ step, maps }: { step: number; maps: SceneMap[] }) {
  const list = maps.length ? maps : FALLBACK_MAPS;
  switch (step) {
    case 0:
      return <PickScene key="pick" maps={list} />;
    case 1:
      return <DraftScene key="draft" />;
    case 2:
      return <FillScene key="fill" />;
    case 3:
      return <StudioScene key="studio" />;
    default:
      return <PublishScene key="publish" />;
  }
}
