import { flattenTree } from "@eef/core";
import { prisma } from "@eef/db";

import { blockProblem, isBlockType } from "./blocks";
import { canTravel } from "./map-access";
import { courseLayout, type CourseData, type CourseLesson, type LessonState } from "./course-model";

/** Load a course for one viewer: tree in travel order, live blocks, their progress. */
export async function loadCourse(
  where: { slug: string } | { id: string },
  viewerId: string,
): Promise<CourseData | null> {
  const map = await prisma.map.findUnique({
    where,
    include: {
      nodes: {
        orderBy: { order: "asc" },
        include: {
          contentBlocks: { orderBy: { blockIndex: "asc" }, include: { attributions: true } },
        },
      },
      edges: true,
      progress: { where: { userId: viewerId } },
    },
  });
  if (!map) return null;
  const isCreator = map.creatorId === viewerId;
  if (!(await canTravel(map, viewerId))) return null;

  const progress = new Map(map.progress.map((p) => [p.nodeId, p]));
  const prerequisites = map.edges
    .filter((e) => e.kind === "prerequisite")
    .map((e) => ({ fromId: e.fromId, toId: e.toId }));

  const tree = flattenTree(map.nodes);
  const depth = new Map<string, number>();
  for (const n of tree) depth.set(n.id, n.parentId ? (depth.get(n.parentId) ?? 0) + 1 : 0);

  const lessons: CourseLesson[] = tree.map((n) => {
    const prereqIds = prerequisites.filter((e) => e.toId === n.id).map((e) => e.fromId);
    const p = progress.get(n.id);
    let state: LessonState;
    if (p?.mastered) state = "mastered";
    else if (prereqIds.some((id) => !progress.get(id)?.mastered)) state = "locked";
    else if (p) state = "in_progress";
    else state = "available";
    return {
      id: n.id,
      slug: n.slug,
      title: n.title,
      parentId: n.parentId,
      order: n.order,
      depth: depth.get(n.id) ?? 0,
      positionX: n.positionX ?? 0,
      positionY: n.positionY ?? 0,
      state,
      prereqIds,
      blocks: n.contentBlocks
        .filter((b) => b.mapVersion === map.version)
        .flatMap((b) => {
          const type = b.type;
          if (!isBlockType(type)) return [];
          if (!isCreator && blockProblem(type, b)) return [];
          const attr = b.attributions[0];
          return [
            {
              id: b.id,
              type,
              title: b.title,
              body: b.body,
              url: b.url,
              durationSeconds: b.durationSeconds,
              optional: b.optional,
              sourceName: attr?.sourceName ?? null,
              sourceUrl: attr?.sourceUrl ?? b.url,
              provenanceModel: b.provenanceModel,
            },
          ];
        }),
    };
  });

  const laid = courseLayout(lessons);
  for (const lesson of lessons) {
    const node = map.nodes.find((n) => n.id === lesson.id);
    if (typeof node?.positionX === "number" && typeof node.positionY === "number") continue;
    const pos = laid.get(lesson.id);
    if (pos) Object.assign(lesson, { positionX: pos.x, positionY: pos.y });
  }

  return {
    mapId: map.id,
    slug: map.slug,
    title: map.title,
    topic: map.topic,
    visibility: map.visibility,
    isCreator,
    lessons,
    prerequisites,
  };
}
