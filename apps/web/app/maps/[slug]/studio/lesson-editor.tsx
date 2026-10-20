"use client";

import { Eye, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BLOCK_TYPES, blockMeta, type BlockType } from "@/lib/blocks";
import { formatTime, lessonMinutes, optionalMinutes, type CourseLesson } from "@/lib/course-model";

import { BlockEditor, type BlockPatch } from "./block-editor";

const AGENT_ACTIONS = [
  { label: "Write this lesson", prompt: "Write this lesson: a teaching reading, a verified video if one exists, and a quiz." },
  { label: "Add a quiz", prompt: "Add a quiz to this lesson." },
  { label: "Find a video", prompt: "Find and add a verified video that explains this lesson." },
  { label: "Simplify", prompt: "Rewrite this lesson's reading simpler for beginners." },
];

export function LessonEditor({
  lesson,
  parentTitle,
  busy,
  onRename,
  onAddBlock,
  onSaveBlock,
  onMoveBlock,
  onDeleteBlock,
  onAsk,
  onPreview,
}: {
  lesson: CourseLesson;
  parentTitle: string | null;
  busy: boolean;
  onRename: (title: string) => void;
  onAddBlock: (type: BlockType) => void;
  onSaveBlock: (blockId: string, patch: BlockPatch) => Promise<void>;
  onMoveBlock: (blockId: string, dir: -1 | 1) => void;
  onDeleteBlock: (blockId: string) => void;
  onAsk: (prompt: string) => void;
  onPreview: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-night-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">
            {parentTitle ? `In ${parentTitle}` : "Module"} · {lesson.blocks.length} parts
            {lesson.blocks.length ? ` · ${formatTime(lessonMinutes(lesson), optionalMinutes(lesson))}` : ""}
          </p>
          <Button type="button" variant="secondary" size="xs" onClick={onPreview}>
            <Eye className="size-3.5" /> Preview
          </Button>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title.trim() !== lesson.title && onRename(title.trim())}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-11 text-lg font-semibold"
          aria-label="Lesson title"
        />
        <div className="flex flex-wrap gap-1.5">
          {AGENT_ACTIONS.map((a) => (
            <Button key={a.label} type="button" variant="secondary" size="xs" disabled={busy} onClick={() => onAsk(a.prompt)}>
              <Sparkles className="size-3 text-aurora-400" />
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            {lesson.blocks.map((block, i) => (
              <BlockEditor
                key={`${block.id}:${block.body?.length ?? 0}:${block.url ?? ""}`}
                block={block}
                index={i}
                total={lesson.blocks.length}
                onSave={(patch) => onSaveBlock(block.id, patch)}
                onMove={(dir) => onMoveBlock(block.id, dir)}
                onDelete={() => onDeleteBlock(block.id)}
              />
            ))}
            {lesson.blocks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-night-800 p-6 text-center text-sm text-star-400">
                Empty lesson. Ask the agent to write it, or add content below.
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full border-dashed">
                  <Plus className="size-4" /> Add content
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>Content type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BLOCK_TYPES.map((type) => {
                  const meta = blockMeta(type);
                  const Icon = meta.icon;
                  return (
                    <DropdownMenuItem key={type} onSelect={() => onAddBlock(type)}>
                      <Icon className="size-4 text-aurora-400" />
                      {meta.label}
                      <span className="ml-auto text-xs text-star-400">{meta.verb}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </ScrollArea>
    </div>
  );
}
