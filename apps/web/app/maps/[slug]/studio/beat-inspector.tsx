"use client";

import { useState } from "react";

import { blockKindLabel } from "../content-media";

const TYPES = ["youtube", "blog", "ai_text", "flashcard", "quiz"] as const;

export type StudioBlock = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  url: string | null;
  blockIndex: number;
};

export function BeatInspector({
  nodeTitle,
  blocks,
  generating,
  onAdd,
  onSave,
  onDelete,
  onGenerate,
}: {
  nodeTitle: string;
  blocks: StudioBlock[];
  generating: boolean;
  onAdd: (type: (typeof TYPES)[number]) => void;
  onSave: (block: StudioBlock) => void;
  onDelete: (blockId: string) => void;
  onGenerate: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, StudioBlock>>({});

  function draft(block: StudioBlock): StudioBlock {
    return drafts[block.id] ?? block;
  }

  return (
    <aside className="rounded-[1.75rem] border border-night-800 bg-night-900 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">This lesson</p>
      <h2 className="mt-2 text-xl font-semibold">{nodeTitle}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="rounded-full border border-night-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-star-400 hover:border-star-400 hover:text-star-100"
          >
            Add {blockKindLabel(type)}
          </button>
        ))}
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="rounded-full border border-aurora-400/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-aurora-400 disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate a beat"}
        </button>
      </div>
      <ul className="mt-6 space-y-5">
        {blocks.length === 0 && (
          <li className="text-sm text-star-400">No beats yet. Add one, or let AI write the idea.</li>
        )}
        {blocks.map((block) => {
          const d = draft(block);
          return (
            <li key={block.id} className="rounded-2xl border border-night-800 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
                {blockKindLabel(block.type)}
              </p>
              <input
                value={d.title ?? ""}
                onChange={(e) => setDrafts((s) => ({ ...s, [block.id]: { ...d, title: e.target.value } }))}
                placeholder="Title"
                className="mt-2 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-star-400"
              />
              {(block.type === "youtube" || block.type === "blog") && (
                <input
                  value={d.url ?? ""}
                  onChange={(e) => setDrafts((s) => ({ ...s, [block.id]: { ...d, url: e.target.value } }))}
                  placeholder="https://"
                  className="mt-2 w-full bg-transparent text-sm text-star-400 outline-none"
                />
              )}
              <textarea
                value={d.body ?? ""}
                onChange={(e) => setDrafts((s) => ({ ...s, [block.id]: { ...d, body: e.target.value } }))}
                rows={block.type === "flashcard" || block.type === "quiz" ? 6 : 5}
                placeholder={
                  block.type === "flashcard"
                    ? '{"front":"…","back":"…"}'
                    : block.type === "quiz"
                      ? '{"prompt":"…","mode":"radio","options":[{"id":"a","label":"…"}],"correct":["a"]}'
                      : "The lesson itself"
                }
                className="mt-2 w-full resize-y bg-transparent text-sm leading-relaxed text-star-400 outline-none"
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => onSave(d)}
                  className="text-sm text-aurora-400 hover:underline"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(block.id)}
                  className="text-sm text-star-400 hover:text-ember-300"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
