"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { buildOutline, type CourseLesson } from "@/lib/course-model";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Confirms deleting a lesson or module, and says exactly what goes with it. */
export function DeleteDialog({
  targetId,
  lessons,
  onClose,
  onDelete,
}: {
  targetId: string | null;
  lessons: CourseLesson[];
  onClose: () => void;
  onDelete: (id: string, withLessons: boolean) => Promise<void>;
}) {
  const [pending, setPending] = useState<"all" | "keep" | null>(null);
  const target = lessons.find((l) => l.id === targetId) ?? null;

  const outline = buildOutline(lessons);
  const subtree = (id: string): CourseLesson[] =>
    lessons.filter((l) => l.parentId === id).flatMap((l) => [l, ...subtree(l.id)]);
  const nested = target ? subtree(target.id) : [];
  const blocks = target ? [target, ...nested].reduce((sum, l) => sum + l.blocks.length, 0) : 0;
  const kind = !target
    ? "lesson"
    : outline.intro?.id === target.id
      ? "intro"
      : outline.modules.some((m) => m.head.id === target.id)
        ? "module"
        : "lesson";
  const noun = kind === "intro" ? "course intro" : kind;
  const parentTitle = target?.parentId ? lessons.find((l) => l.id === target.parentId)?.title : null;

  async function run(withLessons: boolean) {
    if (!target) return;
    setPending(withLessons ? "all" : "keep");
    try {
      await onDelete(target.id, withLessons);
      onClose();
    } finally {
      setPending(null);
    }
  }

  return (
    <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-ember-500/10 text-ember-300">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Delete {noun} “{target?.title}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nested.length ? (
              <>
                It holds {plural(nested.length, "lesson")}
                {blocks ? ` and ${plural(blocks, "content block")}` : ""}.{" "}
                {nested.length === 1 && !blocks
                  ? "Delete it too, or keep the lesson and move it"
                  : "Delete everything, or keep the lessons and move them"}{" "}
                {parentTitle ? `into “${parentTitle}”` : kind === "intro" ? "up so each module stands alone" : "up a level"}.
              </>
            ) : blocks ? (
              <>Its {plural(blocks, "content block")} will be deleted with it.</>
            ) : (
              <>It’s empty, so nothing else is lost.</>
            )}{" "}
            Learner progress on deleted lessons goes too. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending !== null}>Cancel</AlertDialogCancel>
          {nested.length ? (
            <Button type="button" variant="outline" disabled={pending !== null} onClick={() => void run(false)}>
              {pending === "keep" ? "Deleting…" : "Keep its lessons"}
            </Button>
          ) : null}
          <Button type="button" variant="destructive" className="bg-ember-500/15 hover:bg-ember-500/25" disabled={pending !== null} onClick={() => void run(true)}>
            {pending === "all" ? "Deleting…" : nested.length ? `Delete ${noun} and ${plural(nested.length, "lesson")}` : `Delete ${noun}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
