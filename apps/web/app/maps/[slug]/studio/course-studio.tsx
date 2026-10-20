"use client";

import { ArrowLeft, Bot, Eye, FileText, ListTree, MessagesSquare, Network, PanelRightClose, PanelRightOpen } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { Button } from "@/components/ui/button";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BlockType } from "@/lib/blocks";
import { buildOutline, moduleOf, type CourseData } from "@/lib/course-model";
import { cn } from "@/lib/utils";

import { PublishButton } from "../publish-button";
import { AgentPanel, type AgentTurn } from "./agent-panel";
import type { BlockPatch } from "./block-editor";
import { CourseCanvas } from "./course-canvas";
import { DeleteDialog } from "./delete-dialog";
import { DocumentEditor, type DocumentActions } from "./document-editor";
import { LearnerPreview } from "./learner-preview";
import { LessonEditor } from "./lesson-editor";
import { OutlineEditor, type OutlineActions } from "./outline-editor";
import { MODEL_REQUIRED } from "@/lib/ai-providers";
import { ApiError, send } from "@/lib/send";
import { isStudioMode, type StudioMode } from "./studio-mode";
import { useMapActions } from "./use-map-actions";

const MODES: { value: StudioMode; label: string; icon: typeof Bot }[] = [
  { value: "chat", label: "Chat", icon: MessagesSquare },
  { value: "map", label: "Map", icon: Network },
  { value: "document", label: "Document", icon: FileText },
];

const BUILD_STEPS = [
  { text: "Reading your brief" },
  { text: "Researching how this is taught" },
  { text: "Drafting modules and lessons" },
  { text: "Writing readings" },
  { text: "Finding videos and sources" },
  { text: "Adding quizzes and flashcards" },
  { text: "Linking the map" },
];

/** One course, three ways to build it: talk to the agent, arrange the map, or write the document. */
export function CourseStudio({
  initial,
  initialFocus,
  initialMode,
  autoBuild = false,
  hasModel,
}: {
  initial: CourseData;
  initialFocus: string | null;
  initialMode: StudioMode | null;
  /** Start the agent on the course topic as soon as the studio opens (from "Watch it build"). */
  autoBuild?: boolean;
  /** the creator brought a model key (or the instance runs mock); without one the agent asks them to connect */
  hasModel: boolean;
}) {
  const [course, setCourse] = useState(initial);
  const [mode, setMode] = useState<StudioMode>(initialMode ?? (initial.lessons.length ? "document" : "chat"));
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.lessons.find((l) => l.slug === initialFocus)?.id ?? initial.lessons[0]?.id ?? null,
  );
  const [turns, setTurns] = useState<AgentTurn[]>(hasModel ? [] : [{ role: "connect" }]);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const [outlineSheet, setOutlineSheet] = useState(false);
  const [lessonSheet, setLessonSheet] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const lessons = course.lessons;
  const mapId = course.mapId;
  const outline = useMemo(() => buildOutline(lessons), [lessons]);
  const selected = lessons.find((l) => l.id === selectedId) ?? null;
  const parent = selected?.parentId ? lessons.find((l) => l.id === selected.parentId) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    params.delete("build");
    if (selected) params.set("lesson", selected.slug);
    else params.delete("lesson");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [mode, selected]);

  const refresh = useCallback(async () => {
    const data = await send(`/api/maps/${mapId}/course`, "GET");
    setCourse(data.course);
    return data.course as CourseData;
  }, [mapId]);

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      try {
        const out = await fn();
        await refresh();
        return out;
      } catch (err) {
        toast.error(`${label}: ${(err as Error).message}`);
        return null;
      }
    },
    [refresh],
  );

  async function askAgent(message: string) {
    if (busy) return;
    const focus = selected && lessons.length ? selected : null;
    const fullBuild = lessons.length === 0;
    const history = turns
      .filter((t): t is Extract<AgentTurn, { role: "user" | "assistant" }> => t.role === "user" || t.role === "assistant")
      .slice(-8)
      .map((t) => ({ role: t.role, content: t.content }));
    setTurns((list) => [...list, { role: "user", content: message, focus: focus?.title ?? null }]);
    setBusy(true);
    setBuilding(fullBuild);
    try {
      const data = await send(`/api/maps/${mapId}/agent`, "POST", { message, focusSlug: focus?.slug ?? null, history });
      const next = data.course as CourseData;
      setCourse(next);
      setTurns((list) => [
        ...list,
        { role: "assistant", content: data.reply, changes: data.changes ?? [], skipped: data.skipped ?? [] },
      ]);
      const touched = (data.changes as { lessonSlug?: string }[]).find((c) => c.lessonSlug)?.lessonSlug;
      if (fullBuild || !focus) setSelectedId(next.lessons.find((l) => l.slug === touched)?.id ?? next.lessons[0]?.id ?? null);
    } catch (err) {
      const connect = err instanceof ApiError && err.code === MODEL_REQUIRED;
      setTurns((list) => [...list, connect ? { role: "connect" } : { role: "error", content: (err as Error).message }]);
    } finally {
      setBusy(false);
      setBuilding(false);
    }
  }

  const autoBuilt = useRef(false);
  useEffect(() => {
    if (!autoBuild || !hasModel || autoBuilt.current) return;
    autoBuilt.current = true;
    void askAgent(`Build a full course on ${course.topic}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on open
  }, [autoBuild]);

  async function renameCourse(title: string) {
    const next = title.trim();
    if (next.length < 2 || next === course.title) return;
    const previous = course.title;
    setCourse((c) => ({ ...c, title: next, topic: next }));
    try {
      await send(`/api/maps/${mapId}`, "PATCH", { title: next });
    } catch (err) {
      setCourse((c) => ({ ...c, title: previous }));
      toast.error(`Rename: ${(err as Error).message}`);
    }
  }

  const mapActions = useMapActions({ course, setCourse, refresh, setSelectedId });

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setLessonSheet(Boolean(id) && mode === "map" && window.matchMedia("(max-width: 1023px)").matches);
      setOutlineSheet(false);
    },
    [mode],
  );

  const outlineActions: OutlineActions = useMemo(
    () => ({
      select: (id) => select(id),
      add: (title, parentId) =>
        void run("Add", async () => {
          const data = await send(`/api/maps/${mapId}/nodes`, "POST", { title, parentId });
          setSelectedId(data.node.id);
        }),
      rename: (id, title) => void run("Rename", () => send(`/api/maps/${mapId}/nodes`, "PATCH", { nodeId: id, title })),
      move: (id, dir) =>
        void run("Move", async () => {
          const node = lessons.find((l) => l.id === id);
          if (!node) return;
          const siblings = lessons.filter((l) => l.parentId === node.parentId).sort((a, b) => a.order - b.order);
          const other = siblings[siblings.findIndex((s) => s.id === id) + dir];
          if (!other) return;
          await send(`/api/maps/${mapId}/nodes`, "PATCH", { nodeId: node.id, order: other.order });
          await send(`/api/maps/${mapId}/nodes`, "PATCH", { nodeId: other.id, order: node.order });
        }),
      remove: (id) => setDeletingId(id),
    }),
    [lessons, mapId, run, select],
  );

  const blockActions = useMemo(() => {
    if (!selected) return null;
    const url = `/api/nodes/${selected.id}/blocks`;
    const actions: DocumentActions = {
      rename: (title) => outlineActions.rename(selected.id, title),
      addBlock: async (type: BlockType, insertAt: number) => {
        const data = await run("Add content", () => send(url, "POST", { type, title: "", insertAt }));
        return (data as { block?: { id: string } } | null)?.block?.id ?? null;
      },
      saveBlock: async (blockId: string, patch: BlockPatch) => {
        const ok = await run("Save", () => send(url, "PATCH", { blockId, ...patch }));
        if (ok === null) throw new Error("not saved");
      },
      moveBlock: (blockId, dir) =>
        void run("Reorder", async () => {
          const i = selected.blocks.findIndex((b) => b.id === blockId);
          const other = selected.blocks[i + dir];
          if (!other) return;
          await send(url, "PATCH", { blockId, blockIndex: 100000 + i });
          await send(url, "PATCH", { blockId: other.id, blockIndex: i });
          await send(url, "PATCH", { blockId, blockIndex: i + dir });
        }),
      deleteBlock: (blockId) => void run("Delete", () => send(url, "DELETE", { blockId })),
      ask: (prompt) => void askAgent(prompt),
      preview: () => setPreviewing(true),
    };
    return actions;
    // askAgent reads the latest state on each call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, outlineActions, run]);

  const currentModule = selected ? moduleOf(outline, selected.id) : null;
  const eyebrow = selected
    ? [
        currentModule
          ? `Module ${outline.modules.indexOf(currentModule) + 1}${currentModule.head.id === selected.id ? "" : ` · ${currentModule.head.title}`}`
          : outline.intro?.id === selected.id
            ? "Start here"
            : "Lesson",
        `${lessons.findIndex((l) => l.id === selected.id) + 1} of ${lessons.length}`,
      ].join(" · ")
    : "";

  const agent = (variant: "dock" | "full") => (
    <AgentPanel
      turns={turns}
      busy={busy}
      focusTitle={selected && lessons.length ? selected.title : null}
      empty={lessons.length === 0}
      variant={variant}
      onSend={(m) => void askAgent(m)}
      onOpenLesson={(slug) => setSelectedId(lessons.find((l) => l.slug === slug)?.id ?? null)}
      onClearFocus={() => setSelectedId(null)}
    />
  );

  const outlinePanel = <OutlineEditor lessons={lessons} selectedId={selectedId} actions={outlineActions} />;

  const compactEditor =
    selected && blockActions ? (
      <LessonEditor
        key={selected.id}
        lesson={selected}
        parentTitle={parent?.title ?? null}
        busy={busy}
        onRename={blockActions.rename}
        onAddBlock={(type) => void blockActions.addBlock(type, selected.blocks.length)}
        onSaveBlock={blockActions.saveBlock}
        onMoveBlock={blockActions.moveBlock}
        onDeleteBlock={blockActions.deleteBlock}
        onAsk={blockActions.ask}
        onPreview={blockActions.preview}
      />
    ) : (
      <div className="grid h-full place-items-center p-8 text-center text-sm text-star-400">
        {lessons.length ? "Select a lesson on the map to edit it." : "Your lessons will appear here once the agent drafts them."}
      </div>
    );

  const canvas = (
    <CourseCanvas
      lessons={lessons}
      edges={course.prerequisites}
      selectedId={selectedId}
      onSelect={select}
      actions={mapActions}
      onRequestDelete={setDeletingId}
    />
  );

  return (
    <main className="flex h-svh flex-col bg-night-950 text-star-100">
      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-night-800 px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to your maps">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.14em] text-star-400 uppercase">Studio</p>
            <CourseTitle key={course.title} title={course.title} onRename={renameCourse} />
          </div>
        </div>

        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => isStudioMode(v) && setMode(v)}
          variant="outline"
          size="sm"
          aria-label="Studio mode"
          className="rounded-xl bg-night-900/60 p-0.5"
        >
          {MODES.map((m) => (
            <ToggleGroupItem key={m.value} value={m.value} aria-label={`${m.label} mode`} className="gap-1.5 px-2.5 sm:px-3">
              <m.icon className="size-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={!lessons.length} onClick={() => setPreviewing(true)}>
            <Eye className="size-3.5" />
            <span className="hidden md:inline">Preview</span>
          </Button>
          <PublishButton
            mapId={mapId}
            slug={course.slug}
            visibility={course.visibility}
            onChange={(visibility) => setCourse((c) => ({ ...c, visibility }))}
          />
          <ThemeToggle className="hidden size-8 sm:grid" />
        </div>
      </header>

      {mode === "chat" ? (
        <div className="flex min-h-0 flex-1">
          <section className="min-h-0 min-w-0 flex-1">{agent("full")}</section>
          <aside className="hidden w-80 shrink-0 flex-col border-l border-night-800 lg:flex">
            <div className="flex items-center justify-between border-b border-night-800 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Course outline</p>
                <p className="text-xs text-star-400">Pick a lesson to focus the agent on it.</p>
              </div>
            </div>
            <div className="min-h-0 flex-1">{outlinePanel}</div>
          </aside>
        </div>
      ) : null}

      {mode === "map" ? (
        <div className="flex min-h-0 flex-1">
          <section className="min-h-0 min-w-0 flex-1">{canvas}</section>
          <aside className="hidden w-[26rem] shrink-0 border-l border-night-800 lg:block">
            <Tabs defaultValue="lesson" className="flex h-full min-h-0 flex-col gap-0">
              <div className="border-b border-night-800 px-3 py-2">
                <TabsList className="w-full">
                  <TabsTrigger value="lesson" className="gap-1.5">
                    <FileText className="size-3.5" /> Lesson
                  </TabsTrigger>
                  <TabsTrigger value="agent" className="gap-1.5">
                    <Bot className="size-3.5" /> Agent
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="lesson" className="min-h-0 flex-1">
                {compactEditor}
              </TabsContent>
              <TabsContent value="agent" className="min-h-0 flex-1">
                {agent("dock")}
              </TabsContent>
            </Tabs>
          </aside>
          <Sheet open={lessonSheet && Boolean(selected)} onOpenChange={setLessonSheet}>
            <SheetContent side="bottom" className="h-[85svh] p-0 lg:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>{selected?.title ?? "Lesson"}</SheetTitle>
                <SheetDescription>Edit this lesson</SheetDescription>
              </SheetHeader>
              {compactEditor}
            </SheetContent>
          </Sheet>
        </div>
      ) : null}

      {mode === "document" ? (
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-72 shrink-0 flex-col border-r border-night-800 md:flex">
            <p className="border-b border-night-800 px-4 py-3 text-sm font-semibold">Course</p>
            <div className="min-h-0 flex-1">{outlinePanel}</div>
          </aside>
          <section className="relative min-h-0 min-w-0 flex-1">
            <div className="absolute top-3 left-3 z-10 md:hidden">
              <Button type="button" variant="secondary" size="xs" onClick={() => setOutlineSheet(true)}>
                <ListTree className="size-3.5" /> Outline
              </Button>
            </div>
            <div className="absolute top-3 right-3 z-10 hidden xl:block">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setAgentOpen((o) => !o)}
                aria-label={agentOpen ? "Hide the agent" : "Show the agent"}
              >
                {agentOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
              </Button>
            </div>
            {selected && blockActions ? (
              <DocumentEditor key={selected.id} lesson={selected} eyebrow={eyebrow} busy={busy} actions={blockActions} />
            ) : (
              <div className="grid h-full place-items-center p-8 text-center">
                <div>
                  <p className="text-lg font-semibold">{lessons.length ? "Pick a lesson to write." : "No lessons yet."}</p>
                  <p className="mt-1 text-sm text-star-400">
                    {lessons.length ? "Choose one from the outline." : "Switch to Chat and describe the course, or add a module."}
                  </p>
                  {!lessons.length ? (
                    <Button type="button" className="mt-5" onClick={() => setMode("chat")}>
                      <MessagesSquare className="size-4" /> Build it in Chat
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </section>
          <aside className={cn("hidden w-[22rem] shrink-0 border-l border-night-800", agentOpen && "xl:block")}>
            {agent("dock")}
          </aside>
          <Sheet open={outlineSheet} onOpenChange={setOutlineSheet}>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="border-b border-night-800 px-4 py-3">
                <SheetTitle className="text-sm">Course</SheetTitle>
                <SheetDescription className="sr-only">Lessons in this course</SheetDescription>
              </SheetHeader>
              {outlinePanel}
            </SheetContent>
          </Sheet>
        </div>
      ) : null}

      <DeleteDialog
        targetId={deletingId}
        lessons={lessons}
        onClose={() => setDeletingId(null)}
        onDelete={(id, withLessons) => mapActions.remove(id, withLessons)}
      />
      <LearnerPreview
        open={previewing}
        onOpenChange={setPreviewing}
        lessons={lessons}
        startId={selected?.id ?? lessons[0]?.id ?? null}
        slug={course.slug}
      />
      <MultiStepLoader loadingStates={BUILD_STEPS} loading={building} duration={1600} loop={false} />
    </main>
  );
}

function CourseTitle({ title, onRename }: { title: string; onRename: (title: string) => void }) {
  const [value, setValue] = useState(title);
  return (
    <h1 className="text-sm font-semibold">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onRename(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(title);
            e.currentTarget.blur();
          }
        }}
        aria-label="Course title"
        maxLength={200}
        className="w-full min-w-0 truncate rounded-md bg-transparent px-1 -mx-1 outline-none hover:bg-night-900 focus:bg-night-900 focus:ring-1 focus:ring-aurora-400/50"
      />
    </h1>
  );
}
