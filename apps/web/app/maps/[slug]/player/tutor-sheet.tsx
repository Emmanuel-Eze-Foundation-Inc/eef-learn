"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LessonMarkdown } from "@/components/learn/lesson-markdown";
import { Owlbert } from "@/components/learn/owlbert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_REQUIRED } from "@/lib/ai-providers";
import { TUTOR } from "@/lib/tutor";
import { cn } from "@/lib/utils";

export type TutorMessage = { role: string; content: string };

export const CONNECT_HREF = "/dashboard?tab=settings#ai";

const STARTERS = ["Explain this like I'm new", "Give me a real-world example", "Quiz me on this"];

export function TutorSheet({
  open,
  onOpenChange,
  mapId,
  lessonId,
  lessonTitle,
  greeting,
  initial,
  ready,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapId: string;
  lessonId: string;
  lessonTitle: string;
  greeting: string;
  initial: TutorMessage[];
  ready: boolean;
}) {
  const [messages, setMessages] = useState<TutorMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; connect: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setDraft("");
    setError(null);
    setSending(true);
    setMessages((list) => [...list, { role: "user", content: message }]);
    const res = await fetch("/api/companion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapId, nodeId: lessonId, message }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res?.ok) {
      setError({ message: body.error ?? "The tutor is unavailable right now.", connect: body.code === MODEL_REQUIRED });
      return;
    }
    setMessages((list) => [...list, { role: "assistant", content: body.reply }]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-night-800 bg-night-950 p-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center gap-3 border-b border-night-800 px-5 py-4">
          <Owlbert size={48} float={false} mood={ready ? (sending ? "thinking" : "idle") : "asleep"} />
          <div className="min-w-0 space-y-0.5">
            <SheetTitle>{TUTOR.name}</SheetTitle>
            <SheetDescription className="truncate">
              {TUTOR.title} · on “{lessonTitle}”
            </SheetDescription>
          </div>
        </SheetHeader>
        {ready ? null : <ConnectFirst />}
        <ScrollArea className={cn("min-h-0 flex-1", !ready && "hidden")}>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl bg-night-900 px-4 py-3 text-sm leading-relaxed text-star-100/90">{greeting}</div>
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user" ? "ml-8 bg-aurora-400/10 text-star-100" : "mr-4 bg-night-900 text-star-100/90",
                )}
              >
                {m.role === "user" ? m.content : <LessonMarkdown markdown={m.content} />}
              </div>
            ))}
            {sending ? (
              <p className="flex items-center gap-2 px-1 text-xs text-star-400">
                <Owlbert size={22} float={false} watch={false} mood="thinking" />
                Consulting the stars…
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="px-1 text-xs text-ember-300">
                {error.message}
                {error.connect ? (
                  <>
                    {" "}
                    <Link href={CONNECT_HREF} className="text-aurora-400 underline-offset-2 hover:underline">
                      Connect it in Settings
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : null}
            <div ref={endRef} />
          </div>
        </ScrollArea>
        <div className={cn("border-t border-night-800 p-4", !ready && "hidden")}>
          {messages.length === 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-night-800 px-3 py-1.5 text-xs text-star-400 hover:border-aurora-400/50 hover:text-star-100"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={`Ask ${TUTOR.short} about this lesson…`}
              rows={2}
              className="min-h-0 resize-none"
            />
            <Button type="submit" disabled={sending || !draft.trim()}>
              Ask
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ConnectFirst() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <Owlbert size={120} mood="asleep" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-star-100">{TUTOR.short} is napping between galaxies</h3>
        <p className="text-sm leading-relaxed text-star-400">
          He thinks with your own model key. Add one from OpenRouter, OpenAI, Anthropic or Google and he wakes up on
          it, with no usage limits from us. EEF Learn doesn&apos;t sell AI credits.
        </p>
      </div>
      <Button asChild>
        <Link href={CONNECT_HREF}>Add a model key</Link>
      </Button>
    </div>
  );
}
