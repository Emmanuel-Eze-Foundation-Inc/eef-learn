"use client";

import { ArrowDown, ArrowUp, Eye, PenLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { BlockView } from "@/components/learn/block-view";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BLOCK_TYPES, blockMeta, blockProblem, type BlockType } from "@/lib/blocks";
import { formatTime, lessonMinutes, optionalMinutes, type CourseLesson } from "@/lib/course-model";
import { cn } from "@/lib/utils";

import { BlockEditor, type BlockPatch } from "./block-editor";

export const LESSON_AGENT_ACTIONS = [
  { label: "Write this lesson", prompt: "Write this lesson: a teaching reading, a verified video if one exists, and a quiz." },
  { label: "Add a quiz", prompt: "Add a quiz to this lesson." },
  { label: "Find a video", prompt: "Find and add a verified video that explains this lesson." },
  { label: "Add flashcards", prompt: "Add two flashcards for the key terms in this lesson." },
  { label: "Simplify", prompt: "Rewrite this lesson's reading simpler for beginners." },
];

export type DocumentActions = {
  rename: (title: string) => void;
  /** resolves to the new block's id so it opens for editing */
  addBlock: (type: BlockType, insertAt: number) => Promise<string | null>;
  saveBlock: (blockId: string, patch: BlockPatch) => Promise<void>;
  moveBlock: (blockId: string, dir: -1 | 1) => void;
  deleteBlock: (blockId: string) => void;
  ask: (prompt: string) => void;
  preview: () => void;
};

function TypeMenuItems({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <>
      <DropdownMenuLabel>Add content</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {BLOCK_TYPES.map((type) => {
        const meta = blockMeta(type);
        const Icon = meta.icon;
        return (
          <DropdownMenuItem key={type} onSelect={() => onPick(type)}>
            <Icon className="size-4 text-aurora-400" />
            {meta.label}
            <span className="ml-auto text-xs text-star-400">{meta.verb}</span>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

function InsertPoint({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <div className="group/insert relative flex h-8 items-center">
      <span className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-night-800" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insert content here"
            className="mx-2 grid size-6 place-items-center rounded-full border border-night-800 bg-night-900 text-star-400 opacity-0 transition-opacity group-hover/insert:opacity-100 hover:border-aurora-400/60 hover:text-aurora-400 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <Plus className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-60">
          <TypeMenuItems onPick={onPick} />
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-night-800" />
    </div>
  );
}

function TypeGrid({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {BLOCK_TYPES.map((type) => {
        const meta = blockMeta(type);
        const Icon = meta.icon;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="group flex items-center gap-2.5 rounded-xl border border-night-800 bg-night-900/50 px-3 py-2.5 text-left transition-colors hover:border-aurora-400/50 hover:bg-night-900"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-night-800 text-star-400 group-hover:text-aurora-400">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-star-100">{meta.label}</span>
              <span className="block text-[11px] text-star-400">{meta.verb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DocBlock({
  block,
  index,
  total,
  lessonTitle,
  editing,
  onEdit,
  onDone,
  actions,
}: {
  block: CourseLesson["blocks"][number];
  index: number;
  total: number;
  lessonTitle: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  actions: DocumentActions;
}) {
  if (editing) {
    return (
      <BlockEditor
        key={`${block.id}:${block.body?.length ?? 0}:${block.url ?? ""}`}
        block={block}
        index={index}
        total={total}
        onSave={(patch) => actions.saveBlock(block.id, patch)}
        onMove={(dir) => actions.moveBlock(block.id, dir)}
        onDelete={() => actions.deleteBlock(block.id)}
        onDone={onDone}
      />
    );
  }
  const problem = blockProblem(block.type, block);
  return (
    <div className="group/block relative -mx-4 rounded-2xl px-4 py-4 transition-colors hover:bg-night-900/50">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-xl border border-night-800 bg-night-900/95 p-0.5 opacity-0 shadow-lg transition-opacity group-hover/block:opacity-100 focus-within:opacity-100">
        <Button type="button" variant="ghost" size="xs" onClick={onEdit}>
          <PenLine className="size-3.5" /> Edit
        </Button>
        <Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => actions.moveBlock(block.id, -1)} aria-label="Move up">
          <ArrowUp className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon-xs" disabled={index === total - 1} onClick={() => actions.moveBlock(block.id, 1)} aria-label="Move down">
          <ArrowDown className="size-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => actions.deleteBlock(block.id)} aria-label="Delete block" className="hover:text-ember-300">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div onDoubleClick={onEdit}>
        <BlockView block={block} index={index} lessonTitle={lessonTitle} />
      </div>
      {problem ? (
        <button type="button" onClick={onEdit} className="mt-3 text-xs text-ember-300 hover:underline">
          Needs work: {problem}
        </button>
      ) : null}
    </div>
  );
}

/** The lesson as a document: what the learner reads, editable in place. */
export function DocumentEditor({
  lesson,
  eyebrow,
  busy,
  actions,
}: {
  lesson: CourseLesson;
  eyebrow: string;
  busy: boolean;
  actions: DocumentActions;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [editingId, setEditingId] = useState<string | null>(null);
  const committed = useRef(lesson.title);

  function commitTitle() {
    const next = title.trim();
    if (!next || next === committed.current) return;
    committed.current = next;
    actions.rename(next);
  }

  async function add(type: BlockType, at: number) {
    const id = await actions.addBlock(type, at);
    if (id) setEditingId(id);
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto w-full max-w-3xl px-6 pt-10 pb-32 md:px-10">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] tracking-[0.14em] text-star-400 uppercase">
            {eyebrow}
            {lesson.blocks.length ? ` · ${formatTime(lessonMinutes(lesson), optionalMinutes(lesson))}` : ""}
          </p>
          <Button type="button" variant="ghost" size="xs" onClick={actions.preview}>
            <Eye className="size-3.5" /> Preview
          </Button>
        </div>
        <textarea
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            commitTitle();
            e.currentTarget.blur();
          }}
          aria-label="Lesson title"
          className="mt-3 field-sizing-content w-full resize-none overflow-hidden bg-transparent text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.1] font-bold tracking-tight text-balance text-star-100 outline-none placeholder:text-star-400/50"
          placeholder="Lesson title"
        />
        <div className="mt-5 flex flex-wrap gap-1.5">
          {LESSON_AGENT_ACTIONS.map((a) => (
            <Button key={a.label} type="button" variant="secondary" size="xs" disabled={busy} onClick={() => actions.ask(a.prompt)}>
              <Sparkles className="size-3 text-aurora-400" />
              {a.label}
            </Button>
          ))}
        </div>

        <div className="mt-8">
          {lesson.blocks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-night-800 p-6 md:p-8">
              <p className="text-lg font-semibold">This lesson is empty.</p>
              <p className="mt-1 text-sm text-star-400">
                Ask the agent to write it, or start with any kind of content.
              </p>
              <Button type="button" className="mt-5" disabled={busy} onClick={() => actions.ask(LESSON_AGENT_ACTIONS[0]!.prompt)}>
                <Sparkles className="size-4" /> Write it with the agent
              </Button>
              <div className="mt-6">
                <TypeGrid onPick={(t) => void add(t, 0)} />
              </div>
            </div>
          ) : (
            <>
              <InsertPoint onPick={(t) => void add(t, 0)} />
              {lesson.blocks.map((block, i) => (
                <div key={block.id}>
                  <div className={cn(editingId === block.id && "py-2")}>
                    <DocBlock
                      block={block}
                      index={i}
                      total={lesson.blocks.length}
                      lessonTitle={lesson.title}
                      editing={editingId === block.id}
                      onEdit={() => setEditingId(block.id)}
                      onDone={() => setEditingId(null)}
                      actions={actions}
                    />
                  </div>
                  <InsertPoint onPick={(t) => void add(t, i + 1)} />
                </div>
              ))}
              <div className="mt-8 rounded-3xl border border-night-800 bg-night-900/30 p-5">
                <p className="mb-3 font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">Add to the end</p>
                <TypeGrid onPick={(t) => void add(t, lesson.blocks.length)} />
              </div>
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
