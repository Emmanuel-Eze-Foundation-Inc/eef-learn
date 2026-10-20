"use client";

import { Bot, CornerDownRight, KeyRound, Link2, Plug, Plus, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { LessonMarkdown } from "@/components/learn/lesson-markdown";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type AgentChange = { kind: "lesson" | "block" | "link"; label: string; lessonSlug?: string };

export type AgentTurn =
  | { role: "user"; content: string; focus: string | null }
  | { role: "assistant"; content: string; changes: AgentChange[]; skipped: string[] }
  | { role: "error"; content: string }
  /** the creator has no model of their own yet; EEF Learn provides no AI credits */
  | { role: "connect" };

const CONNECT_HREF = "/dashboard?tab=settings#ai";

function ConnectCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-aurora-400/30 bg-night-900 px-4 py-4 text-sm">
      <p className="font-semibold text-star-100">Connect your AI to build with the agent</p>
      <p className="leading-relaxed text-star-400">
        EEF Learn doesn&apos;t provide AI credits. Bring your own and there are no usage limits.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={CONNECT_HREF}
          className="flex items-start gap-2.5 rounded-xl border border-night-800 px-3 py-2.5 transition-colors hover:border-aurora-400/50"
        >
          <Plug className="mt-0.5 size-4 shrink-0 text-aurora-400" />
          <span>
            <span className="block text-star-100">Connect your assistant</span>
            <span className="block text-xs text-star-400">Claude, ChatGPT, Cursor or Gemini builds the course here</span>
          </span>
        </Link>
        <Link
          href={CONNECT_HREF}
          className="flex items-start gap-2.5 rounded-xl border border-night-800 px-3 py-2.5 transition-colors hover:border-aurora-400/50"
        >
          <KeyRound className="mt-0.5 size-4 shrink-0 text-aurora-400" />
          <span>
            <span className="block text-star-100">Add a model key</span>
            <span className="block text-xs text-star-400">OpenRouter, OpenAI, Anthropic or Google</span>
          </span>
        </Link>
      </div>
      <p className="text-xs text-star-400">You can still build by hand in Map or Document mode.</p>
    </div>
  );
}

const COURSE_PROMPTS = [
  "Build a full course outline with readings and quizzes",
  "Add a module on real-world projects",
  "Link the modules so each builds on the last",
  "Add a final assessment lesson",
];

const LESSON_PROMPTS = [
  "Write this lesson with a reading and a quiz",
  "Find a video that explains this",
  "Add a code example",
  "Make this simpler for beginners",
  "Add two flashcards",
];

function ChangeIcon({ kind }: { kind: AgentChange["kind"] }) {
  switch (kind) {
    case "lesson":
      return <Plus className="size-3" />;
    case "block":
      return <SquarePen className="size-3" />;
    case "link":
      return <Link2 className="size-3" />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function AgentPanel({
  turns,
  busy,
  focusTitle,
  empty,
  variant = "dock",
  onSend,
  onOpenLesson,
  onClearFocus,
}: {
  turns: AgentTurn[];
  busy: boolean;
  focusTitle: string | null;
  empty: boolean;
  /** dock: a side panel; full: chat mode, the conversation is the whole stage */
  variant?: "dock" | "full";
  onSend: (message: string) => void;
  onOpenLesson: (slug: string) => void;
  onClearFocus?: () => void;
}) {
  const full = variant === "full";
  const endRef = useRef<HTMLDivElement>(null);
  const draft = useRef("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, busy]);

  const prompts = focusTitle && !empty ? LESSON_PROMPTS : COURSE_PROMPTS;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex items-center gap-2.5 border-b border-night-800 px-4 py-3", full && "justify-center")}>
        <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", full && "max-w-3xl")}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-aurora-400/15 text-aurora-400">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Course agent</p>
            <p className="truncate text-xs text-star-400">
              {focusTitle ? `Focused on “${focusTitle}”` : "Working on the whole course"}
            </p>
          </div>
          {focusTitle && onClearFocus ? (
            <button
              type="button"
              onClick={onClearFocus}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-night-800 px-2.5 py-1 text-[11px] text-star-400 hover:border-star-400/60 hover:text-star-100"
            >
              <X className="size-3" /> Whole course
            </button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("space-y-4 p-4", full && "mx-auto max-w-3xl py-8")}>
          {turns.length === 0 && full ? (
            <div className="pt-[8vh] pb-4">
              <h2 className="text-[clamp(1.8rem,3.2vw,2.5rem)] leading-[1.1] font-bold tracking-tight text-balance">
                {empty ? "What should this course teach?" : focusTitle ? `What should change in “${focusTitle}”?` : "What should change in this course?"}
              </h2>
              <p className="mt-3 max-w-xl text-star-400">
                {empty
                  ? "Say who it's for and what they should be able to do. I'll draft the modules, write every lesson with readings, videos, and checks, and link the map."
                  : "Ask in plain words. I can add modules, write lessons, find verified videos, build quizzes and flashcards, and link what builds on what."}
              </p>
              <div className="mt-8 grid gap-2 sm:grid-cols-2">
                {prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    onClick={() => onSend(p)}
                    className="rounded-2xl border border-night-800 bg-night-900/50 px-4 py-3 text-left text-sm text-star-100/90 transition-colors enabled:hover:border-aurora-400/50 enabled:hover:bg-night-900 disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : turns.length === 0 ? (
            <div className="rounded-2xl border border-night-800 bg-night-900/60 p-4 text-sm leading-relaxed text-star-400">
              {empty
                ? "Tell me what this course should teach and who it's for. I'll draft modules, write each lesson with mixed content, and link the map."
                : "Ask for any change in plain words. Select a lesson first to work on just that lesson."}
            </div>
          ) : null}
          {turns.map((turn, i) => {
            switch (turn.role) {
              case "user":
                return (
                  <div key={i} className="ml-6 rounded-2xl bg-aurora-400/10 px-4 py-3 text-sm text-star-100">
                    {turn.focus ? (
                      <p className="mb-1 font-mono text-[10px] tracking-[0.1em] text-aurora-400 uppercase">
                        on {turn.focus}
                      </p>
                    ) : null}
                    {turn.content}
                  </div>
                );
              case "assistant":
                return (
                  <div key={i} className="mr-2 space-y-3 rounded-2xl bg-night-900 px-4 py-3 text-sm">
                    <LessonMarkdown markdown={turn.content} />
                    {turn.changes.length ? (
                      <ul className="space-y-1 border-t border-night-800 pt-3">
                        {turn.changes.slice(0, 14).map((c, j) => (
                          <li key={j}>
                            <button
                              type="button"
                              disabled={!c.lessonSlug}
                              onClick={() => c.lessonSlug && onOpenLesson(c.lessonSlug)}
                              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-star-400 enabled:hover:bg-night-800 enabled:hover:text-star-100"
                            >
                              <span className="grid size-5 shrink-0 place-items-center rounded bg-night-800 text-aurora-400">
                                <ChangeIcon kind={c.kind} />
                              </span>
                              <span className="truncate">{c.label}</span>
                            </button>
                          </li>
                        ))}
                        {turn.changes.length > 14 ? (
                          <li className="px-1.5 text-xs text-star-400">+ {turn.changes.length - 14} more</li>
                        ) : null}
                      </ul>
                    ) : null}
                    {turn.skipped.length ? (
                      <p className="text-xs text-star-400">Skipped {turn.skipped.length} change(s) that didn&apos;t fit the course.</p>
                    ) : null}
                  </div>
                );
              case "connect":
                return <ConnectCard key={i} />;
              case "error":
                return (
                  <p key={i} role="alert" className="rounded-xl border border-ember-500/40 px-4 py-3 text-sm text-ember-300">
                    {turn.content}
                  </p>
                );
              default: {
                const _exhaustive: never = turn;
                return _exhaustive;
              }
            }
          })}
          {busy ? (
            <div className="flex items-center gap-2 px-1 text-xs text-star-400">
              <span className="size-1.5 animate-pulse rounded-full bg-aurora-400" />
              The agent is editing the course…
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className={cn("space-y-3 border-t border-night-800 p-4", full && "border-t-0 pb-6")}>
        <div className={cn("flex flex-wrap gap-1.5", full && "mx-auto max-w-3xl", full && turns.length === 0 && "hidden")}>
          {prompts.slice(0, 4).map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => onSend(p)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-night-800 px-2.5 py-1 text-[11px] text-star-400",
                "enabled:hover:border-aurora-400/50 enabled:hover:text-star-100 disabled:opacity-50",
              )}
            >
              <CornerDownRight className="size-3" />
              {p}
            </button>
          ))}
        </div>
        <div className={cn(full && "mx-auto max-w-3xl")}>
        <PlaceholdersAndVanishInput
          placeholders={
            empty
              ? ["A beginner course on prompt engineering…", "Intro to personal finance for teens…", "Python for data analysis, 4 weeks…"]
              : ["Add a module on evaluation…", "Write this lesson with a video and a quiz…", "Make module 2 more hands-on…"]
          }
          disabled={busy}
          onChange={(e) => {
            draft.current = e.target.value;
          }}
          onSubmit={() => {
            const text = draft.current.trim();
            draft.current = "";
            if (text) onSend(text);
          }}
        />
        </div>
      </div>
    </div>
  );
}
