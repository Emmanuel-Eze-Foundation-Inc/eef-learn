import { flattenTree } from "@eef/core";
import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { BLOCK_TYPES, blockMeta, blockProblem, isBlockType, type BlockType } from "./blocks";
import { graphProblems, publicHttpUrlError } from "./map-author";
import { mediaDurationSeconds } from "./media-duration";

export const agentOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add_lesson"), slug: z.string().min(1).max(80), title: z.string().min(1).max(160), parent: z.string().nullable().optional() }),
  z.object({ op: z.literal("update_lesson"), slug: z.string(), title: z.string().min(1).max(160).optional(), parent: z.string().nullable().optional() }),
  z.object({ op: z.literal("remove_lesson"), slug: z.string() }),
  z.object({
    op: z.literal("add_block"),
    lesson: z.string(),
    type: z.enum(BLOCK_TYPES),
    title: z.string().max(160).nullable().optional(),
    body: z.string().max(20000).nullable().optional(),
    url: z.string().max(500).nullable().optional(),
    sourceName: z.string().max(200).nullable().optional(),
    sourceUrl: z.string().max(500).nullable().optional(),
    sourceType: z.string().max(40).nullable().optional(),
    optional: z.boolean().optional(),
  }),
  z.object({
    op: z.literal("update_block"),
    id: z.string(),
    title: z.string().max(160).optional(),
    body: z.string().max(20000).optional(),
    url: z.string().max(500).optional(),
    optional: z.boolean().optional(),
  }),
  z.object({ op: z.literal("remove_block"), id: z.string() }),
  z.object({ op: z.literal("add_prerequisite"), from: z.string(), to: z.string() }),
  z.object({ op: z.literal("remove_prerequisite"), from: z.string(), to: z.string() }),
]);

export type AgentOp = z.infer<typeof agentOpSchema>;

export type AgentCourseSnapshot = {
  title: string;
  topic: string;
  nodes: { slug: string; title: string; depth: number; blocks: { id: string; type: string; title: string | null; preview: string }[] }[];
  prerequisites: { from: string; to: string }[];
};

/** What the agent sees: the tree in travel order with short block previews. */
export async function agentSnapshot(mapId: string): Promise<AgentCourseSnapshot | null> {
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { nodes: { include: { contentBlocks: { orderBy: { blockIndex: "asc" } } } }, edges: true },
  });
  if (!map) return null;
  const tree = flattenTree(map.nodes);
  const depth = new Map<string, number>();
  for (const n of tree) depth.set(n.id, n.parentId ? (depth.get(n.parentId) ?? 0) + 1 : 0);
  const slugOf = new Map(map.nodes.map((n) => [n.id, n.slug]));
  return {
    title: map.title,
    topic: map.topic,
    nodes: tree.map((n) => ({
      slug: n.slug,
      title: n.title,
      depth: depth.get(n.id) ?? 0,
      blocks: n.contentBlocks
        .filter((b) => b.mapVersion === map.version)
        .map((b) => ({ id: b.id, type: b.type, title: b.title, preview: (b.body ?? b.url ?? "").slice(0, 160) })),
    })),
    prerequisites: map.edges
      .filter((e) => e.kind === "prerequisite")
      .map((e) => ({ from: slugOf.get(e.fromId) ?? "", to: slugOf.get(e.toId) ?? "" })),
  };
}

export type AppliedChange = { kind: "lesson" | "block" | "link"; label: string; lessonSlug?: string };

type WorkNode = { id: string; slug: string; title: string; parentId: string | null; order: number; isNew: boolean };

function urlProblem(type: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const err = publicHttpUrlError(url);
  if (err) return err;
  if (type === "embed" && !url.startsWith("https://")) return "embeds must be https";
  return null;
}

/**
 * Validate the agent's ops against the live course and apply them in one
 * transaction. Ops that don't fit (unknown ids, loops, bad urls) are skipped.
 */
export async function applyAgentOps(mapId: string, rawOps: unknown[], model: string | null) {
  const map = await prisma.map.findUniqueOrThrow({
    where: { id: mapId },
    include: { nodes: { include: { contentBlocks: true } }, edges: true },
  });
  const nodes: WorkNode[] = map.nodes.map((n) => ({ id: n.id, slug: n.slug, title: n.title, parentId: n.parentId, order: n.order, isNew: false }));
  const bySlug = () => new Map(nodes.map((n) => [n.slug, n]));
  let edges = map.edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind }));
  const blockOwner = new Map(
    map.nodes.flatMap((n) => n.contentBlocks.filter((b) => b.mapVersion === map.version).map((b) => [b.id, n.id] as const)),
  );
  const nextIndex = new Map<string, number>();
  for (const n of map.nodes) {
    const live = n.contentBlocks.filter((b) => b.mapVersion === map.version);
    nextIndex.set(n.id, live.reduce((m, b) => Math.max(m, b.blockIndex), -1) + 1);
  }

  const blockType = new Map(map.nodes.flatMap((n) => n.contentBlocks.map((b) => [b.id, b.type] as const)));
  const blockFields = new Map(map.nodes.flatMap((n) => n.contentBlocks.map((b) => [b.id, { body: b.body, url: b.url }] as const)));
  const media: [BlockType, string][] = rawOps.flatMap((raw) => {
    const parsed = agentOpSchema.safeParse(raw);
    if (!parsed.success) return [];
    const op = parsed.data;
    if (op.op === "add_block" && op.url) return [[op.type, op.url] as [BlockType, string]];
    const type = op.op === "update_block" ? blockType.get(op.id) : undefined;
    if (op.op === "update_block" && op.url && type && isBlockType(type)) return [[type, op.url] as [BlockType, string]];
    return [];
  });
  const durations = new Map<string, number | null>(
    await Promise.all(media.map(async ([type, url]) => [`${type} ${url}`, await mediaDurationSeconds(type, url)] as const)),
  );
  const durationOf = (type: string, url: string | null | undefined) => (url ? (durations.get(`${type} ${url}`) ?? null) : null);

  const writes: ((tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<unknown>)[] = [];
  const changes: AppliedChange[] = [];
  const skipped: string[] = [];

  for (const raw of rawOps) {
    const parsed = agentOpSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.push("malformed op");
      continue;
    }
    const op = parsed.data;
    const slugs = bySlug();
    switch (op.op) {
      case "add_lesson": {
        const parent = op.parent ? slugs.get(op.parent) : null;
        if (op.parent && !parent) {
          skipped.push(`unknown parent ${op.parent}`);
          break;
        }
        let slug = op.slug;
        for (let n = 2; slugs.has(slug); n += 1) slug = `${op.slug}-${n}`;
        const siblings = nodes.filter((n) => n.parentId === (parent?.id ?? null));
        const node: WorkNode = {
          id: `node_${createId()}`,
          slug,
          title: op.title.trim(),
          parentId: parent?.id ?? null,
          order: siblings.reduce((m, n) => Math.max(m, n.order), -1) + 1,
          isNew: true,
        };
        nodes.push(node);
        nextIndex.set(node.id, 0);
        writes.push((tx) =>
          tx.node.create({ data: { id: node.id, mapId, slug: node.slug, title: node.title, parentId: node.parentId, order: node.order } }),
        );
        changes.push({ kind: "lesson", label: `${parent ? "Lesson" : "Module"} “${node.title}”`, lessonSlug: node.slug });
        break;
      }
      case "update_lesson": {
        const node = slugs.get(op.slug);
        if (!node) {
          skipped.push(`unknown lesson ${op.slug}`);
          break;
        }
        let parentId = node.parentId;
        if (op.parent !== undefined) {
          const parent = op.parent ? slugs.get(op.parent) : null;
          if (op.parent && !parent) {
            skipped.push(`unknown parent ${op.parent}`);
            break;
          }
          parentId = parent?.id ?? null;
          const trial = nodes.map((n) => (n.id === node.id ? { ...n, parentId } : n));
          if (graphProblems(trial, edges).length) {
            skipped.push(`moving ${op.slug} would loop the tree`);
            break;
          }
        }
        node.parentId = parentId;
        if (op.title) node.title = op.title.trim();
        const { id, title } = node;
        writes.push((tx) => tx.node.update({ where: { id }, data: { title, parentId } }));
        changes.push({ kind: "lesson", label: `Updated “${title}”`, lessonSlug: node.slug });
        break;
      }
      case "remove_lesson": {
        const node = slugs.get(op.slug);
        if (!node) {
          skipped.push(`unknown lesson ${op.slug}`);
          break;
        }
        for (const child of nodes.filter((n) => n.parentId === node.id)) child.parentId = node.parentId;
        nodes.splice(nodes.indexOf(node), 1);
        edges = edges.filter((e) => e.fromId !== node.id && e.toId !== node.id);
        const { id, parentId } = node;
        writes.push(async (tx) => {
          await tx.node.updateMany({ where: { parentId: id }, data: { parentId } });
          await tx.node.delete({ where: { id } });
        });
        changes.push({ kind: "lesson", label: `Removed “${node.title}”` });
        break;
      }
      case "add_block": {
        const node = slugs.get(op.lesson);
        const problem = urlProblem(op.type, op.url) ?? blockProblem(op.type, { body: op.body ?? null, url: op.url ?? null });
        if (!node || problem) {
          skipped.push(node ? `${blockMeta(op.type).label} in ${op.lesson}: ${problem}` : `unknown lesson ${op.lesson}`);
          break;
        }
        const blockIndex = nextIndex.get(node.id) ?? 0;
        nextIndex.set(node.id, blockIndex + 1);
        const blockId = `blk_${createId()}`;
        writes.push(async (tx) => {
          await tx.contentBlock.create({
            data: {
              id: blockId,
              nodeId: node.id,
              blockIndex,
              type: op.type,
              title: op.title ?? null,
              body: op.body ?? null,
              url: op.url ?? null,
              durationSeconds: durationOf(op.type, op.url),
              optional: op.optional ?? false,
              provenanceModel: model,
              mapVersion: map.version,
            },
          });
          if (op.sourceName) {
            await tx.attribution.create({
              data: {
                contentBlockId: blockId,
                sourceType: op.sourceType ?? (op.type === "youtube" ? "youtube" : "blog"),
                sourceName: op.sourceName,
                sourceUrl: op.sourceUrl ?? op.url ?? null,
              },
            });
          }
        });
        changes.push({ kind: "block", label: `${blockMeta(op.type).label} in “${node.title}”`, lessonSlug: node.slug });
        break;
      }
      case "update_block":
      case "remove_block": {
        const ownerId = blockOwner.get(op.id);
        const owner = nodes.find((n) => n.id === ownerId);
        if (!owner) {
          skipped.push(`unknown block ${op.id}`);
          break;
        }
        if (op.op === "remove_block") {
          blockOwner.delete(op.id);
          writes.push((tx) => tx.contentBlock.delete({ where: { id: op.id } }));
          changes.push({ kind: "block", label: `Removed a block from “${owner.title}”`, lessonSlug: owner.slug });
          break;
        }
        if (op.url && urlProblem("", op.url)) {
          skipped.push("bad url");
          break;
        }
        const type = blockType.get(op.id);
        const before = blockFields.get(op.id);
        const after = { body: op.body ?? before?.body ?? null, url: op.url ?? before?.url ?? null };
        const contentProblem = type && isBlockType(type) ? blockProblem(type, after) : null;
        if (contentProblem) {
          skipped.push(`block ${op.id}: ${contentProblem}`);
          break;
        }
        blockFields.set(op.id, after);
        const durationSeconds = op.url === undefined ? undefined : durationOf(blockType.get(op.id) ?? "", op.url);
        writes.push((tx) =>
          tx.contentBlock.update({
            where: { id: op.id },
            data: { title: op.title, body: op.body, url: op.url, durationSeconds, optional: op.optional, provenanceModel: model },
          }),
        );
        changes.push({ kind: "block", label: `Rewrote a block in “${owner.title}”`, lessonSlug: owner.slug });
        break;
      }
      case "add_prerequisite":
      case "remove_prerequisite": {
        const from = slugs.get(op.from);
        const to = slugs.get(op.to);
        if (!from || !to || from.id === to.id) {
          skipped.push("link needs two different lessons");
          break;
        }
        if (op.op === "remove_prerequisite") {
          edges = edges.filter((e) => !(e.fromId === from.id && e.toId === to.id && e.kind === "prerequisite"));
          writes.push((tx) => tx.edge.deleteMany({ where: { mapId, fromId: from.id, toId: to.id, kind: "prerequisite" } }));
          changes.push({ kind: "link", label: `Unlinked “${from.title}” → “${to.title}”` });
          break;
        }
        if (edges.some((e) => e.fromId === from.id && e.toId === to.id && e.kind === "prerequisite")) break;
        const trial = [...edges, { fromId: from.id, toId: to.id, kind: "prerequisite" }];
        if (graphProblems(nodes, trial).length) {
          skipped.push(`linking ${op.from} → ${op.to} would loop`);
          break;
        }
        edges = trial;
        writes.push((tx) =>
          tx.edge.create({ data: { id: `edge_${createId()}`, mapId, fromId: from.id, toId: to.id, kind: "prerequisite" } }),
        );
        changes.push({ kind: "link", label: `“${to.title}” builds on “${from.title}”` });
        break;
      }
      default: {
        const _exhaustive: never = op;
        return _exhaustive;
      }
    }
  }

  if (writes.length) {
    await prisma.$transaction(async (tx) => {
      for (const write of writes) await write(tx);
    });
  }
  return { changes, skipped };
}
