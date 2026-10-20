import { LAYOUT_COL, LAYOUT_INDENT, LAYOUT_ROW } from "@eef/core";

import { blockMeta, type BlockType } from "./blocks";

export type LessonState = "mastered" | "in_progress" | "available" | "locked";

export type CourseBlock = {
  id: string;
  type: BlockType;
  title: string | null;
  body: string | null;
  url: string | null;
  durationSeconds: number | null;
  optional: boolean;
  sourceName: string | null;
  sourceUrl: string | null;
  provenanceModel: string | null;
};

export type CourseLesson = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  order: number;
  depth: number;
  positionX: number;
  positionY: number;
  state: LessonState;
  prereqIds: string[];
  blocks: CourseBlock[];
};

export type CourseEdge = { fromId: string; toId: string };

export type CourseData = {
  mapId: string;
  slug: string;
  title: string;
  topic: string;
  visibility: string;
  isCreator: boolean;
  /** travel order: depth-first through the tree */
  lessons: CourseLesson[];
  prerequisites: CourseEdge[];
};

export type CourseModule = {
  /** the module node itself — also a lesson when it has content */
  head: CourseLesson;
  lessons: CourseLesson[];
};

export type CourseOutline = {
  intro: CourseLesson | null;
  modules: CourseModule[];
};

/**
 * Modules are the top level of the tree. When a course has a single root with
 * children, that root is the intro and its children are the modules.
 */
export function buildOutline(lessons: CourseLesson[]): CourseOutline {
  const roots = lessons.filter((l) => l.parentId === null);
  const childrenOf = (id: string) => lessons.filter((l) => l.parentId === id);
  const descendants = (id: string): CourseLesson[] =>
    childrenOf(id).flatMap((child) => [child, ...descendants(child.id)]);

  let intro: CourseLesson | null = null;
  let tops = roots;
  if (roots.length === 1 && childrenOf(roots[0]!.id).length > 0) {
    intro = roots[0]!;
    tops = childrenOf(intro.id);
  }
  const byOrder = new Map(lessons.map((l, i) => [l.id, i]));
  const sorted = (list: CourseLesson[]) =>
    [...list].sort((a, b) => (byOrder.get(a.id) ?? 0) - (byOrder.get(b.id) ?? 0));

  return {
    intro,
    modules: sorted(tops).map((head) => ({ head, lessons: sorted(descendants(head.id)) })),
  };
}

export function moduleOf(outline: CourseOutline, lessonId: string): CourseModule | null {
  return (
    outline.modules.find((m) => m.head.id === lessonId || m.lessons.some((l) => l.id === lessonId)) ??
    null
  );
}

export function blockMinutes(b: CourseBlock): number {
  if (b.durationSeconds) return Math.ceil(b.durationSeconds / 60);
  if (b.type === "ai_text" && b.body) return Math.ceil(b.body.split(/\s+/).length / 220);
  return blockMeta(b.type).minutes;
}

/** Core time: what it takes to finish the lesson, leaving out optional deep dives. */
export function lessonMinutes(lesson: CourseLesson): number {
  return Math.max(1, lesson.blocks.reduce((sum, b) => (b.optional ? sum : sum + blockMinutes(b)), 0));
}

export function optionalMinutes(lesson: CourseLesson): number {
  return lesson.blocks.reduce((sum, b) => (b.optional ? sum + blockMinutes(b) : sum), 0);
}

export function totalMinutes(lessons: CourseLesson[]): number {
  return lessons.reduce((sum, l) => sum + (l.blocks.length ? lessonMinutes(l) : 0), 0);
}

export function totalOptionalMinutes(lessons: CourseLesson[]): number {
  return lessons.reduce((sum, l) => sum + optionalMinutes(l), 0);
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "1 h 30 min + 2 h optional", or just the core time when there is nothing optional. */
export function formatTime(core: number, optional: number): string {
  return optional ? `${formatMinutes(core)} + ${formatMinutes(optional)} optional` : formatMinutes(core);
}

/** Recompute lock state after a lesson is mastered on the client. */
export function withMastered(lessons: CourseLesson[], masteredId: string): CourseLesson[] {
  const mastered = new Set(lessons.filter((l) => l.state === "mastered").map((l) => l.id));
  mastered.add(masteredId);
  return lessons.map((l) => {
    if (mastered.has(l.id)) return { ...l, state: "mastered" };
    if (l.state === "locked" && l.prereqIds.every((id) => mastered.has(id))) {
      return { ...l, state: "available" };
    }
    return l;
  });
}

export const COURSE_COL = LAYOUT_COL;
export const COURSE_ROW = LAYOUT_ROW;

/**
 * Where a new child of `parentId` should sit: under the parent's last
 * descendant, so it never lands on top of an existing card. Adding under the
 * intro (or at the top level) opens a new module column instead.
 */
export function childSlot(lessons: CourseLesson[], parentId: string | null): { x: number; y: number } {
  const outline = buildOutline(lessons);
  const heads = outline.modules.map((m) => m.head);
  const parent = parentId ? lessons.find((l) => l.id === parentId) : null;
  if (!parent || parent.id === outline.intro?.id) {
    if (!heads.length) return { x: parent?.positionX ?? 0, y: (parent?.positionY ?? -COURSE_ROW * 1.5) + COURSE_ROW * 1.5 };
    return { x: Math.max(...heads.map((h) => h.positionX)) + COURSE_COL, y: heads[0]!.positionY };
  }
  const descendants = (id: string): CourseLesson[] =>
    lessons.filter((l) => l.parentId === id).flatMap((c) => [c, ...descendants(c.id)]);
  const subtree = descendants(parent.id);
  const firstChild = lessons.find((l) => l.parentId === parent.id);
  const isHead = heads.some((h) => h.id === parent.id);
  const x = firstChild?.positionX ?? parent.positionX + (isHead ? 0 : 20);
  const bottom = Math.max(parent.positionY, ...subtree.map((l) => l.positionY));
  return { x, y: bottom + (subtree.length || !isHead ? COURSE_ROW : COURSE_ROW * 1.4) };
}

/** Modules side by side, each module's lessons stacked beneath it. */
export function courseLayout(lessons: CourseLesson[]): Map<string, { x: number; y: number }> {
  const outline = buildOutline(lessons);
  const out = new Map<string, { x: number; y: number }>();
  const top = outline.intro ? COURSE_ROW * 1.5 : 0;
  if (outline.intro) {
    out.set(outline.intro.id, { x: ((outline.modules.length - 1) * COURSE_COL) / 2, y: 0 });
  }
  outline.modules.forEach((m, i) => {
    const x = i * COURSE_COL;
    out.set(m.head.id, { x, y: top });
    m.lessons.forEach((l, j) => {
      out.set(l.id, { x: x + (l.depth - m.head.depth - 1) * LAYOUT_INDENT, y: top + COURSE_ROW * (1.4 + j) });
    });
  });
  return out;
}

/** Generated maps often prefix every lesson with the topic ("Topic: Basics"); drop the part they all share. */
export function sharedPrefixStripper(titles: string[]): (title: string) => string {
  const prefixes = titles.map((t) => t.match(/^[^:]{2,60}:\s+/)?.[0]?.toLowerCase() ?? null);
  const first = prefixes[0];
  if (titles.length < 2 || !first || prefixes.some((p) => p !== first)) return (title) => title;
  return (title) => title.slice(first.length);
}
