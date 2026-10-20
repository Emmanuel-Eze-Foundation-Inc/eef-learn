import { flattenTree, resolvePositions } from "@eef/core";
import { prisma } from "@eef/db";

import { blockProblem, isBlockType, type BlockType } from "./blocks";
import { buildOutline, courseLayout, totalMinutes, sharedPrefixStripper, type CourseLesson } from "./course-model";

export type PublicMapNode = {
  id: string;
  slug: string;
  title: string;
  order: number;
  parentId: string | null;
  positionX: number;
  positionY: number;
  leadType: string | null;
};
export type PublicMapEdge = { fromId: string; toId: string; kind: "contains" | "prerequisite" };

/** One card on the course map, at the position its creator gave it in the studio. */
export type CourseCard = {
  id: string;
  title: string;
  parentId: string | null;
  x: number;
  y: number;
  role: "intro" | "module" | "lesson";
  lead: BlockType | null;
};

export type CourseSummary = {
  cards: CourseCard[];
  prerequisites: { fromId: string; toId: string }[];
  modules: { id: string; title: string; lessons: number }[];
  lessons: number;
  minutes: number;
  /** content types in the course, most used first */
  mix: { type: BlockType; count: number }[];
};

export type PublicMap = {
  slug: string;
  title: string;
  topic: string;
  creatorName: string;
  updatedAt: string;
  nodes: PublicMapNode[];
  edges: PublicMapEdge[];
  course: CourseSummary;
};

export async function getPublicMaps(take?: number): Promise<PublicMap[]> {
  const maps = await prisma.map.findMany({
    where: { visibility: "public", nodes: { some: {} } },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      creator: { select: { name: true } },
      nodes: {
        orderBy: { order: "asc" },
        include: {
          contentBlocks: {
            orderBy: { blockIndex: "asc" },
            select: { type: true, body: true, url: true, durationSeconds: true, optional: true, mapVersion: true },
          },
        },
      },
      edges: { select: { fromId: true, toId: true, kind: true } },
    },
  });

  return maps.map((map) => {
    const tree = flattenTree(map.nodes.map((n) => ({ ...n, parentId: n.parentId })));
    const positions = resolvePositions(tree);
    const live = (n: (typeof tree)[number]) => {
      const ready = n.contentBlocks.filter((b) => isBlockType(b.type) && !blockProblem(b.type, b));
      const current = ready.filter((b) => b.mapVersion === map.version);
      return current.length ? current : ready;
    };
    const nodes: PublicMapNode[] = tree.map((n) => {
      const pos = positions.get(n.id) ?? { x: 120, y: 80 };
      return {
        id: n.id,
        slug: n.slug,
        title: n.title,
        order: n.order,
        parentId: n.parentId,
        positionX: pos.x,
        positionY: pos.y,
        leadType: live(n)[0]?.type ?? null,
      };
    });
    const edges: PublicMapEdge[] = [
      ...nodes
        .filter((n) => n.parentId)
        .map((n) => ({ fromId: n.parentId!, toId: n.id, kind: "contains" as const })),
      ...map.edges
        .filter((e) => e.kind === "prerequisite")
        .map((e) => ({ fromId: e.fromId, toId: e.toId, kind: "prerequisite" as const })),
    ];
    return {
      slug: map.slug,
      title: map.title,
      topic: map.topic,
      creatorName: map.creator.name || "an EEF learner",
      updatedAt: map.updatedAt.toISOString(),
      nodes,
      edges,
      course: summarize(tree, live, map.edges),
    };
  });
}

type TreeNode = {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
  order: number;
  positionX: number | null;
  positionY: number | null;
};

function summarize<N extends TreeNode>(
  tree: N[],
  live: (n: N) => { type: string; body: string | null; durationSeconds: number | null; optional: boolean }[],
  edges: { fromId: string; toId: string; kind: string }[],
): CourseSummary {
  const depth = new Map<string, number>();
  for (const n of tree) depth.set(n.id, n.parentId ? (depth.get(n.parentId) ?? 0) + 1 : 0);

  const lessons: CourseLesson[] = tree.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    parentId: n.parentId,
    order: n.order,
    depth: depth.get(n.id) ?? 0,
    positionX: n.positionX ?? 0,
    positionY: n.positionY ?? 0,
    state: "available",
    prereqIds: [],
    blocks: live(n).flatMap((b, i) =>
      isBlockType(b.type)
        ? [
            {
              id: `${n.id}:${i}`,
              type: b.type,
              title: null,
              body: b.body,
              url: null,
              durationSeconds: b.durationSeconds,
              optional: b.optional,
              sourceName: null,
              sourceUrl: null,
              provenanceModel: null,
            },
          ]
        : [],
    ),
  }));

  const label = sharedPrefixStripper(lessons.map((l) => l.title));
  const laid = courseLayout(lessons);
  const outline = buildOutline(lessons);
  const heads = new Set(outline.modules.map((m) => m.head.id));
  const placed = new Map(tree.map((n) => [n.id, typeof n.positionX === "number" && typeof n.positionY === "number"]));

  const counts = new Map<BlockType, number>();
  for (const lesson of lessons) {
    for (const block of lesson.blocks) counts.set(block.type, (counts.get(block.type) ?? 0) + 1);
  }

  return {
    cards: lessons.map((l) => {
      const pos = placed.get(l.id) ? { x: l.positionX, y: l.positionY } : (laid.get(l.id) ?? { x: 0, y: 0 });
      return {
        id: l.id,
        title: label(l.title),
        parentId: l.parentId,
        x: pos.x,
        y: pos.y,
        role: l.id === outline.intro?.id ? "intro" : heads.has(l.id) ? "module" : "lesson",
        lead: l.blocks[0]?.type ?? null,
      };
    }),
    prerequisites: edges
      .filter((e) => e.kind === "prerequisite")
      .map((e) => ({ fromId: e.fromId, toId: e.toId })),
    modules: outline.modules.map((m) => ({ id: m.head.id, title: label(m.head.title), lessons: m.lessons.length })),
    lessons: lessons.length,
    minutes: totalMinutes(lessons),
    mix: [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
  };
}
