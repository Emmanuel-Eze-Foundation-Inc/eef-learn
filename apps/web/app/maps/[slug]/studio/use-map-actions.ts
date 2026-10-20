"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { buildOutline, childSlot, courseLayout, type CourseData, type CourseLesson } from "@/lib/course-model";

import { send } from "@/lib/send";

export type MapActions = ReturnType<typeof useMapActions>;

type Step = { label: string; undo: () => Promise<void>; redo: () => Promise<void> };

type NewLesson = { title: string; parentId: string | null; positionX: number; positionY: number };

const HISTORY_LIMIT = 50;

/**
 * Every map edit goes through here so it can be undone. Steps hold the ids
 * they were recorded with; `resolve` follows ids re-created by a redo.
 */
export function useMapActions({
  course,
  setCourse,
  refresh,
  setSelectedId,
}: {
  course: CourseData;
  setCourse: Dispatch<SetStateAction<CourseData>>;
  refresh: () => Promise<CourseData>;
  setSelectedId: (id: string | null) => void;
}) {
  const nodesUrl = `/api/maps/${course.mapId}/nodes`;
  const edgesUrl = `/api/maps/${course.mapId}/edges`;

  const latest = useRef(course);
  useEffect(() => {
    latest.current = course;
  }, [course]);

  const past = useRef<Step[]>([]);
  const future = useRef<Step[]>([]);
  const [depth, setDepth] = useState({ undo: 0, redo: 0 });
  const sync = useCallback(() => setDepth({ undo: past.current.length, redo: future.current.length }), []);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const aliases = useRef(new Map<string, string>());

  const resolve = useCallback((id: string) => {
    let current = id;
    while (aliases.current.has(current)) current = aliases.current.get(current)!;
    return current;
  }, []);

  const lessonById = (id: string) => latest.current.lessons.find((l) => l.id === resolve(id)) ?? null;

  const patchLessons = useCallback(
    (fn: (lessons: CourseLesson[]) => CourseLesson[]) => setCourse((c) => ({ ...c, lessons: fn(c.lessons) })),
    [setCourse],
  );

  /** Run edits one at a time so undo never races the edit it reverses. */
  const enqueue = useCallback(
    (job: () => Promise<void>) => {
      const next = queue.current.then(job).catch(() => undefined);
      queue.current = next;
      return next;
    },
    [],
  );

  const commit = useCallback(
    (label: string, apply: () => Promise<void>, step: Step | null) =>
      enqueue(async () => {
        try {
          await apply();
          if (step) {
            past.current = [...past.current, step].slice(-HISTORY_LIMIT);
            future.current = [];
            sync();
          }
        } catch (err) {
          toast.error(`${label}: ${(err as Error).message}`);
        }
        await refresh().catch(() => undefined);
      }),
    [enqueue, refresh, sync],
  );

  async function createLesson(input: NewLesson): Promise<string> {
    const data = await send(nodesUrl, "POST", { ...input, parentId: input.parentId ? resolve(input.parentId) : null });
    const node = data.node as { id: string; slug: string; title: string; parentId: string | null; order: number };
    const parent = node.parentId ? lessonById(node.parentId) : null;
    patchLessons((lessons) => [
      ...lessons,
      {
        id: node.id,
        slug: node.slug,
        title: node.title,
        parentId: node.parentId,
        order: node.order,
        depth: parent ? parent.depth + 1 : 0,
        positionX: input.positionX,
        positionY: input.positionY,
        state: "available",
        prereqIds: [],
        blocks: [],
      },
    ]);
    return node.id;
  }

  async function deleteLesson(id: string) {
    const lesson = lessonById(id);
    if (lesson?.blocks.length) throw new Error(`“${lesson.title}” has content now. Delete it from the outline instead.`);
    await send(nodesUrl, "DELETE", { nodeId: resolve(id) });
    setSelectedId(lesson?.parentId ?? null);
  }

  async function placeNode(id: string, to: { parentId?: string | null; order?: number; x?: number; y?: number }) {
    const nodeId = resolve(id);
    const parentId = to.parentId === undefined ? undefined : to.parentId && resolve(to.parentId);
    patchLessons((lessons) =>
      lessons.map((l) =>
        l.id === nodeId
          ? {
              ...l,
              parentId: parentId === undefined ? l.parentId : parentId,
              order: to.order ?? l.order,
              positionX: to.x ?? l.positionX,
              positionY: to.y ?? l.positionY,
            }
          : l,
      ),
    );
    await send(nodesUrl, "PATCH", { nodeId, parentId, order: to.order, positionX: to.x, positionY: to.y });
  }

  async function setLink(fromId: string, toId: string, on: boolean) {
    const from = resolve(fromId);
    const to = resolve(toId);
    setCourse((c) => ({
      ...c,
      prerequisites: on
        ? [...c.prerequisites, { fromId: from, toId: to }]
        : c.prerequisites.filter((e) => !(e.fromId === from && e.toId === to)),
    }));
    await send(edgesUrl, on ? "POST" : "DELETE", { fromId: from, toId: to });
  }

  function add(input: NewLesson, label = "add lesson") {
    let createdId = "";
    return commit(
      "Add",
      async () => {
        createdId = await createLesson(input);
        setSelectedId(createdId);
      },
      {
        label,
        undo: () => deleteLesson(createdId),
        redo: async () => {
          const previous = resolve(createdId);
          const id = await createLesson(input);
          aliases.current.set(previous, id);
          setSelectedId(id);
        },
      },
    );
  }

  function addChild(parentId: string | null) {
    const slot = childSlot(latest.current.lessons, parentId);
    const outline = buildOutline(latest.current.lessons);
    const opensModule = !parentId || parentId === outline.intro?.id;
    return add(
      { title: opensModule ? "New module" : "New lesson", parentId, positionX: slot.x, positionY: slot.y },
      opensModule ? "add module" : "add lesson",
    );
  }

  /** Add a lesson that builds on `fromId`, in the same module. */
  function addAfter(fromId: string, x: number, y: number) {
    const from = lessonById(fromId);
    let createdId = "";
    const input: NewLesson = { title: "New lesson", parentId: from?.parentId ?? null, positionX: x, positionY: y };
    return commit(
      "Add",
      async () => {
        createdId = await createLesson(input);
        await setLink(fromId, createdId, true);
        setSelectedId(createdId);
      },
      {
        label: "add lesson",
        undo: () => deleteLesson(createdId),
        redo: async () => {
          const previous = resolve(createdId);
          const id = await createLesson(input);
          aliases.current.set(previous, id);
          await setLink(fromId, id, true);
          setSelectedId(id);
        },
      },
    );
  }

  function nest(childId: string, parentId: string | null) {
    const child = lessonById(childId);
    if (!child || child.parentId === parentId) return Promise.resolve();
    const others = latest.current.lessons.filter((l) => l.id !== child.id);
    const slot = childSlot(others, parentId);
    const order = others.filter((l) => l.parentId === parentId).reduce((max, l) => Math.max(max, l.order), -1) + 1;
    const before = { parentId: child.parentId, order: child.order, x: child.positionX, y: child.positionY };
    const after = { parentId, order, x: slot.x, y: slot.y };
    return commit("Nest", () => placeNode(childId, after), {
      label: parentId ? "nest lesson" : "unnest lesson",
      undo: () => placeNode(childId, before),
      redo: () => placeNode(childId, after),
    });
  }

  function move(id: string, x: number, y: number) {
    const lesson = lessonById(id);
    if (!lesson || (Math.abs(lesson.positionX - x) < 1 && Math.abs(lesson.positionY - y) < 1)) return Promise.resolve();
    const before = { x: lesson.positionX, y: lesson.positionY };
    return commit("Move", () => placeNode(id, { x, y }), {
      label: "move",
      undo: () => placeNode(id, before),
      redo: () => placeNode(id, { x, y }),
    });
  }

  function toggleLink(fromId: string, toId: string) {
    const on = !latest.current.prerequisites.some((e) => e.fromId === resolve(fromId) && e.toId === resolve(toId));
    return commit("Link", () => setLink(fromId, toId, on), {
      label: on ? "link" : "unlink",
      undo: () => setLink(fromId, toId, !on),
      redo: () => setLink(fromId, toId, on),
    });
  }

  function unlink(kind: "contains" | "prerequisite", fromId: string, toId: string) {
    if (kind === "prerequisite") return toggleLink(fromId, toId);
    const intro = buildOutline(latest.current.lessons).intro;
    return nest(toId, intro && intro.id !== fromId ? intro.id : null);
  }

  async function placeAll(positions: Map<string, { x: number; y: number }>) {
    const resolved = new Map([...positions].map(([id, p]) => [resolve(id), p]));
    patchLessons((lessons) =>
      lessons.map((l) => {
        const p = resolved.get(l.id);
        return p ? { ...l, positionX: p.x, positionY: p.y } : l;
      }),
    );
    await Promise.all(
      [...resolved].map(([nodeId, p]) => send(nodesUrl, "PATCH", { nodeId, positionX: p.x, positionY: p.y })),
    );
  }

  function arrange() {
    const lessons = latest.current.lessons;
    const before = new Map(lessons.map((l) => [l.id, { x: l.positionX, y: l.positionY }]));
    const after = courseLayout(lessons);
    return commit("Arrange", () => placeAll(after), {
      label: "auto-arrange",
      undo: () => placeAll(before),
      redo: () => placeAll(after),
    });
  }

  /** Deleting can't be undone, and earlier steps may point at what's gone, so history starts over. */
  function remove(id: string, withLessons: boolean) {
    const lesson = lessonById(id);
    return commit(
      "Delete",
      async () => {
        await send(nodesUrl, "DELETE", { nodeId: resolve(id), withLessons });
        past.current = [];
        future.current = [];
        sync();
        setSelectedId(lesson?.parentId ?? null);
        toast.success(`Deleted “${lesson?.title ?? "lesson"}”`);
      },
      null,
    );
  }

  const travel = useCallback(
    (from: typeof past, to: typeof future, direction: "undo" | "redo") =>
      enqueue(async () => {
        const step = from.current.at(-1);
        if (!step) return;
        from.current = from.current.slice(0, -1);
        try {
          await step[direction]();
          to.current = [...to.current, step];
          toast(`${direction === "undo" ? "Undid" : "Redid"} ${step.label}`, { duration: 1400 });
        } catch (err) {
          toast.error(`Couldn't ${direction} ${step.label}: ${(err as Error).message}`);
        }
        sync();
        await refresh().catch(() => undefined);
      }),
    [enqueue, refresh, sync],
  );

  const undo = useCallback(() => travel(past, future, "undo"), [travel]);
  const redo = useCallback(() => travel(future, past, "redo"), [travel]);

  return {
    add,
    addChild,
    addAfter,
    nest,
    move,
    toggleLink,
    unlink,
    arrange,
    remove,
    undo,
    redo,
    history: { canUndo: depth.undo > 0, canRedo: depth.redo > 0 },
  };
}
