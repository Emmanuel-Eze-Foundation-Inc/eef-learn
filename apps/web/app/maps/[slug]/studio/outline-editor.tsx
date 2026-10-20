"use client";

import { ArrowDown, ArrowUp, Ellipsis, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { blockMeta } from "@/lib/blocks";
import { buildOutline, type CourseLesson } from "@/lib/course-model";
import { cn } from "@/lib/utils";

export type OutlineActions = {
  select: (id: string) => void;
  add: (title: string, parentId: string | null) => void;
  rename: (id: string, title: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  remove: (id: string) => void;
};

function Row({
  lesson,
  label,
  indent,
  selected,
  heading,
  actions,
}: {
  lesson: CourseLesson;
  label?: string;
  indent: number;
  selected: boolean;
  heading?: boolean;
  actions: OutlineActions;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const kinds = [...new Set(lesson.blocks.map((b) => b.type))].slice(0, 4);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg pr-1 transition-colors",
        selected ? "bg-aurora-400/10" : "hover:bg-night-800/50",
      )}
      style={{ paddingLeft: `${0.5 + indent * 1}rem` }}
    >
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (title.trim() && title.trim() !== lesson.title) actions.rename(lesson.id, title.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setTitle(lesson.title);
              setEditing(false);
            }
          }}
          className="my-1 h-8 min-w-0 flex-1 rounded-md border border-aurora-400/50 bg-night-950 px-2 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => actions.select(lesson.id)}
          onDoubleClick={() => setEditing(true)}
          className="min-w-0 flex-1 py-2 text-left"
        >
          <span className={cn("block truncate text-sm", heading ? "font-semibold text-star-100" : "text-star-100/90")}>
            {label ?? lesson.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-star-400">
            {kinds.length ? (
              kinds.map((k) => {
                const Icon = blockMeta(k).icon;
                return <Icon key={k} className="size-3" aria-label={blockMeta(k).label} />;
              })
            ) : (
              <span className="font-mono text-[10px] tracking-[0.08em] text-ember-300/80 uppercase">empty</span>
            )}
            {lesson.blocks.length ? (
              <span className="font-mono text-[10px] tracking-[0.08em]">{lesson.blocks.length}</span>
            ) : null}
          </span>
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Actions for ${lesson.title}`}
          >
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setEditing(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.add("New lesson", lesson.id)}>
            <Plus className="size-4" /> Add lesson inside
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.move(lesson.id, -1)}>
            <ArrowUp className="size-4" /> Move up
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.move(lesson.id, 1)}>
            <ArrowDown className="size-4" /> Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(lesson.id)}>
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function OutlineEditor({
  lessons,
  selectedId,
  actions,
}: {
  lessons: CourseLesson[];
  selectedId: string | null;
  actions: OutlineActions;
}) {
  const outline = buildOutline(lessons);
  const moduleParent = outline.intro?.id ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          {outline.intro ? (
            <div>
              <p className="px-2 pb-1 font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">Start here</p>
              <Row lesson={outline.intro} indent={0} selected={selectedId === outline.intro.id} heading actions={actions} />
            </div>
          ) : null}
          {outline.modules.map((m, i) => (
            <div key={m.head.id} className="rounded-xl border border-night-800 bg-night-900/40 p-1.5">
              <p className="px-2 pt-1 font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">
                Module {i + 1}
              </p>
              <Row lesson={m.head} indent={0} selected={selectedId === m.head.id} heading actions={actions} />
              {m.lessons.map((l) => (
                <Row
                  key={l.id}
                  lesson={l}
                  indent={l.depth - m.head.depth}
                  selected={selectedId === l.id}
                  actions={actions}
                />
              ))}
              <button
                type="button"
                onClick={() => actions.add("New lesson", m.head.id)}
                className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-star-400 hover:bg-night-800/50 hover:text-star-100"
              >
                <Plus className="size-3.5" /> Lesson
              </button>
            </div>
          ))}
          {lessons.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-star-400">
              No lessons yet. Ask the agent to draft the outline, or add a module.
            </p>
          ) : null}
        </div>
      </ScrollArea>
      <div className="border-t border-night-800 p-3">
        <Button type="button" variant="secondary" className="w-full" onClick={() => actions.add("New module", moduleParent)}>
          <Plus className="size-4" /> Add module
        </Button>
      </div>
    </div>
  );
}
