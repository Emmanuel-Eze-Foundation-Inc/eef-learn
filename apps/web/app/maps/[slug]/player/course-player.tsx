"use client";

import { BookOpen, Network } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { Owlbert } from "@/components/learn/owlbert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildOutline, moduleOf, withMastered, type CourseData } from "@/lib/course-model";
import { TUTOR } from "@/lib/tutor";

import { MapComplete } from "../map-complete";
import { CourseMap } from "./course-map";
import { CourseSidebar } from "./course-sidebar";
import { LessonView } from "./lesson-view";
import { TutorDock } from "./tutor-dock";
import { TutorSheet, type TutorMessage } from "./tutor-sheet";

type View = "lesson" | "map";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

/** The learning environment: module outline + lesson + the course as a map. */
export function CoursePlayer({
  course,
  initialLessonId,
  greeting,
  tutorMessages,
  tutorReady,
}: {
  course: CourseData;
  initialLessonId: string;
  greeting: string;
  tutorMessages: TutorMessage[];
  tutorReady: boolean;
}) {
  const [lessons, setLessons] = useState(course.lessons);
  const [currentId, setCurrentId] = useState(initialLessonId);
  const [view, setView] = useState<View>("lesson");
  const [tutorOpen, setTutorOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [finished, setFinished] = useState(false);

  const outline = useMemo(() => buildOutline(lessons), [lessons]);
  const lesson = lessons.find((l) => l.id === currentId) ?? lessons[0]!;
  const currentModule = moduleOf(outline, lesson.id);
  const moduleIndex = currentModule ? outline.modules.indexOf(currentModule) : -1;
  const moduleLabel = currentModule ? `Module ${moduleIndex + 1} · ${currentModule.head.title}` : outline.intro ? "Start here" : null;

  const open = useCallback(
    (id: string) => {
      const target = lessons.find((l) => l.id === id);
      if (!target) return;
      setCurrentId(id);
      setView("lesson");
      window.history.replaceState(null, "", `/maps/${course.slug}?node=${encodeURIComponent(target.slug)}`);
      window.scrollTo({ top: 0 });
      if (target.state === "available") {
        setLessons((list) => list.map((l) => (l.id === id ? { ...l, state: "in_progress" } : l)));
        void fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: id }),
        });
      }
    },
    [lessons, course.slug],
  );

  async function complete() {
    setCompleting(true);
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: lesson.id, mastered: true }),
    }).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => ({})) : null;
    setCompleting(false);
    if (!body) return;
    const nextLessons = withMastered(lessons, lesson.id);
    setLessons(nextLessons);
    if (body.mapComplete) {
      setFinished(true);
      return;
    }
    const index = nextLessons.findIndex((l) => l.id === lesson.id);
    const next = nextLessons.slice(index + 1).find((l) => l.state !== "locked" || course.isCreator);
    if (next) {
      setCurrentId(next.id);
      window.history.replaceState(null, "", `/maps/${course.slug}?node=${encodeURIComponent(next.slug)}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || view !== "lesson") return;
      const index = lessons.findIndex((l) => l.id === currentId);
      if (e.key === "ArrowRight" && index < lessons.length - 1) open(lessons[index + 1]!.id);
      if (e.key === "ArrowLeft" && index > 0) open(lessons[index - 1]!.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lessons, currentId, view, open]);

  return (
    <SidebarProvider style={{ "--sidebar-width": "20rem" } as React.CSSProperties}>
      <CourseSidebar
        title={course.title}
        slug={course.slug}
        outline={outline}
        lessons={lessons}
        currentId={lesson.id}
        isCreator={course.isCreator}
        onOpen={open}
      />
      <SidebarInset className="min-w-0 bg-night-950">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-night-800 bg-night-950/85 px-3 backdrop-blur md:px-5">
          <SidebarTrigger className="text-star-400 hover:text-star-100" />
          <Separator orientation="vertical" className="h-5 bg-night-800" />
          <Breadcrumb className="hidden min-w-0 md:block">
            <BreadcrumbList className="flex-nowrap">
              {currentModule && currentModule.head.id !== lesson.id ? (
                <>
                  <BreadcrumbItem className="max-w-[16rem] truncate text-star-400">{currentModule.head.title}</BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : null}
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate text-star-100">{lesson.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="lesson" className="gap-1.5">
                  <BookOpen className="size-3.5" />
                  Lesson
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-1.5">
                  <Network className="size-3.5" />
                  Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button type="button" variant="secondary" size="sm" onClick={() => setTutorOpen(true)} className="gap-1 pl-1.5">
              <Owlbert size={22} float={false} watch={false} mood={tutorReady ? "idle" : "asleep"} />
              <span className="hidden sm:inline">{TUTOR.short}</span>
            </Button>
            <ThemeToggle className="size-8" />
          </div>
        </header>

        {view === "lesson" ? (
          <LessonView
            key={lesson.id}
            lesson={lesson}
            lessons={lessons}
            moduleLabel={moduleLabel}
            slug={course.slug}
            isCreator={course.isCreator}
            completing={completing}
            onOpen={open}
            onComplete={() => void complete()}
            onShowMap={() => setView("map")}
          />
        ) : (
          <CourseMap
            lessons={lessons}
            prerequisites={course.prerequisites}
            outline={outline}
            currentId={lesson.id}
            onOpen={open}
          />
        )}
      </SidebarInset>

      <TutorSheet
        open={tutorOpen}
        onOpenChange={setTutorOpen}
        mapId={course.mapId}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        greeting={greeting}
        initial={tutorMessages}
        ready={tutorReady}
      />
      <TutorDock ready={tutorReady} hidden={tutorOpen || finished} onOpen={() => setTutorOpen(true)} />

      {finished ? (
        <div className="fixed inset-0 z-50">
          <MapComplete mapTitle={course.title} />
        </div>
      ) : null}
    </SidebarProvider>
  );
}
