"use client";

import { ArrowDown, ArrowUp, Check, CircleAlert, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { parseFlashcard, parseQuiz, type QuizData } from "@/components/learn/recall-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { blockMeta, blockProblem, parseCode } from "@/lib/blocks";
import type { CourseBlock } from "@/lib/course-model";

export type BlockPatch = { title: string | null; body: string | null; url: string | null; optional: boolean };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] tracking-[0.12em] text-star-400 uppercase">{label}</span>
      {children}
    </label>
  );
}

function QuizFields({ value, onChange }: { value: QuizData; onChange: (next: QuizData) => void }) {
  const nextId = () => String.fromCharCode(97 + value.options.length);
  return (
    <div className="space-y-3">
      <Field label="Question">
        <Textarea rows={2} value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} />
      </Field>
      <div className="flex gap-2">
        {(["radio", "multi"] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="xs"
            variant={value.mode === mode ? "default" : "outline"}
            onClick={() => onChange({ ...value, mode, correct: mode === "radio" ? value.correct.slice(0, 1) : value.correct })}
          >
            {mode === "radio" ? "One answer" : "Several answers"}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <span className="block font-mono text-[10px] tracking-[0.12em] text-star-400 uppercase">
          Options — tick the right {value.mode === "radio" ? "one" : "ones"}
        </span>
        {value.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              type={value.mode === "radio" ? "radio" : "checkbox"}
              checked={value.correct.includes(opt.id)}
              onChange={() =>
                onChange({
                  ...value,
                  correct:
                    value.mode === "radio"
                      ? [opt.id]
                      : value.correct.includes(opt.id)
                        ? value.correct.filter((c) => c !== opt.id)
                        : [...value.correct, opt.id],
                })
              }
              className="accent-aurora-400"
              aria-label={`Mark option ${i + 1} correct`}
            />
            <Input
              value={opt.label}
              onChange={(e) =>
                onChange({
                  ...value,
                  options: value.options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)),
                })
              }
              className="h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={value.options.length <= 2}
              onClick={() =>
                onChange({
                  ...value,
                  options: value.options.filter((o) => o.id !== opt.id),
                  correct: value.correct.filter((c) => c !== opt.id),
                })
              }
              aria-label="Remove option"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange({ ...value, options: [...value.options, { id: nextId(), label: "" }] })}
        >
          <Plus className="size-3.5" /> Option
        </Button>
      </div>
    </div>
  );
}

const EMPTY_QUIZ: QuizData = {
  prompt: "",
  mode: "radio",
  options: [
    { id: "a", label: "" },
    { id: "b", label: "" },
  ],
  correct: ["a"],
};

export function BlockEditor({
  block,
  index,
  total,
  onSave,
  onMove,
  onDelete,
  onDone,
}: {
  block: CourseBlock;
  index: number;
  total: number;
  onSave: (patch: BlockPatch) => Promise<void>;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  /** document mode: close the editor and show the block as learners see it */
  onDone?: () => void;
}) {
  const meta = blockMeta(block.type);
  const Icon = meta.icon;
  const [title, setTitle] = useState(block.title ?? "");
  const [url, setUrl] = useState(block.url ?? "");
  const [body, setBody] = useState(block.body ?? "");
  const [quiz, setQuiz] = useState<QuizData>(() => parseQuiz(block.body) ?? EMPTY_QUIZ);
  const [card, setCard] = useState(() => parseFlashcard(block.body) ?? { front: "", back: "" });
  const [code, setCode] = useState(() => parseCode(block.body) ?? { language: "", code: "" });
  const [optional, setOptional] = useState(block.optional);
  const [saving, setSaving] = useState(false);

  function nextBody(): string | null {
    switch (block.type) {
      case "quiz":
        return JSON.stringify({ ...quiz, options: quiz.options.filter((o) => o.label.trim()) });
      case "flashcard":
        return JSON.stringify(card);
      case "code":
        return JSON.stringify(code);
      default:
        return body.trim() ? body : null;
    }
  }

  const patch: BlockPatch = { title: title.trim() || null, body: nextBody(), url: url.trim() || null, optional };
  const [baseline, setBaseline] = useState(patch);
  const dirty =
    patch.title !== baseline.title ||
    patch.body !== baseline.body ||
    patch.url !== baseline.url ||
    patch.optional !== baseline.optional;
  const problem = blockProblem(block.type, patch);

  async function save() {
    setSaving(true);
    try {
      await onSave(patch);
      setBaseline(patch);
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-night-800 bg-night-900/60">
      <div className="flex items-center gap-2 border-b border-night-800 px-3 py-2">
        <span className="grid size-7 place-items-center rounded-md bg-night-800 text-aurora-400">
          <Icon className="size-3.5" />
        </span>
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="font-mono text-[10px] text-star-400">#{index + 1}</span>
        {block.provenanceModel ? (
          <span className="font-mono text-[10px] tracking-[0.08em] text-star-400 uppercase">· agent</span>
        ) : null}
        <div className="ml-auto flex items-center">
          <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
            <ArrowUp className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move down">
            <ArrowDown className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete block" className="hover:text-ember-300">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-3 p-3">
        {block.type !== "ai_text" ? (
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={meta.label} className="h-9" />
          </Field>
        ) : null}
        {meta.needsUrl || block.type === "pdf_extract" ? (
          <Field label="URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={meta.urlHint} className="h-9 font-mono text-xs" />
          </Field>
        ) : null}
        {block.type === "quiz" ? (
          <QuizFields value={quiz} onChange={setQuiz} />
        ) : block.type === "flashcard" ? (
          <>
            <Field label="Front">
              <Textarea rows={2} value={card.front} onChange={(e) => setCard({ ...card, front: e.target.value })} />
            </Field>
            <Field label="Back">
              <Textarea rows={2} value={card.back} onChange={(e) => setCard({ ...card, back: e.target.value })} />
            </Field>
          </>
        ) : block.type === "code" ? (
          <>
            <Field label="Language">
              <Input value={code.language} onChange={(e) => setCode({ ...code, language: e.target.value })} placeholder="python" className="h-9" />
            </Field>
            <Field label="Code">
              <Textarea
                rows={8}
                value={code.code}
                onChange={(e) => setCode({ ...code, code: e.target.value })}
                className="font-mono text-xs"
                spellCheck={false}
              />
            </Field>
          </>
        ) : (
          <Field label={block.type === "ai_text" ? "Lesson text (markdown)" : "Notes"}>
            <Textarea
              rows={block.type === "ai_text" ? 12 : 3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={meta.bodyHint}
              className={block.type === "ai_text" ? "font-mono text-[13px] leading-relaxed" : undefined}
            />
          </Field>
        )}
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={optional} onCheckedChange={setOptional} size="sm" />
          <span>Optional deep dive</span>
          <span className="text-xs text-star-400">Not counted in the lesson&apos;s time</span>
        </label>
        {problem || dirty || onDone ? (
          <div className="flex items-center justify-end gap-3">
            {problem ? (
              <p className="mr-auto flex items-center gap-1.5 text-xs text-ember-300">
                <CircleAlert className="size-3.5 shrink-0" /> {problem}
              </p>
            ) : null}
            {dirty ? (
              <Button type="button" size="sm" onClick={() => void save()} disabled={saving || Boolean(problem)}>
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : onDone ? (
              <Button type="button" size="sm" variant="secondary" onClick={onDone}>
                <Check className="size-3.5" /> Done
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
