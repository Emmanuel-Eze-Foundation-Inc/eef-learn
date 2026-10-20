"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildOutline, moduleOf, type CourseLesson } from "@/lib/course-model";

import { LessonView } from "../player/lesson-view";

/** The learner's lesson page, full size, for a fresh learner with no progress. */
export function LearnerPreview({
  open,
  onOpenChange,
  lessons,
  startId,
  slug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessons: CourseLesson[];
  startId: string | null;
  slug: string;
}) {
  const fresh = useMemo(() => lessons.map((l) => ({ ...l, state: "available" as const })), [lessons]);
  const outline = useMemo(() => buildOutline(fresh), [fresh]);
  const [currentId, setCurrentId] = useState(startId);
  const [openedFor, setOpenedFor] = useState(startId);
  const scroller = useRef<HTMLDivElement>(null);
  const router = useRouter();

  if (open && openedFor !== startId) {
    setOpenedFor(startId);
    setCurrentId(startId);
  }

  const lesson = fresh.find((l) => l.id === currentId) ?? fresh[0];
  if (!lesson) return null;
  const mod = moduleOf(outline, lesson.id);
  const moduleLabel = mod
    ? `Module ${outline.modules.indexOf(mod) + 1} · ${mod.head.title}`
    : outline.intro
      ? "Start here"
      : null;

  const go = (id: string) => {
    setCurrentId(id);
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col overflow-hidden rounded-3xl bg-night-950 p-0">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-night-800 px-5 pr-12">
          <Eye className="size-4 text-aurora-400" />
          <DialogTitle className="text-sm font-semibold">Learner preview</DialogTitle>
          <DialogDescription className="truncate text-xs">
            What a new learner sees. Progress isn&apos;t saved here.
          </DialogDescription>
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <LessonView
            key={lesson.id}
            lesson={lesson}
            lessons={fresh}
            moduleLabel={moduleLabel}
            slug={slug}
            isCreator
            completing={false}
            onOpen={go}
            onComplete={() => {
              const next = fresh[fresh.findIndex((l) => l.id === lesson.id) + 1];
              if (next) go(next.id);
              else toast("That's the end of the course.");
            }}
            onShowMap={() => router.push(`/maps/${slug}?node=${encodeURIComponent(lesson.slug)}`)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
