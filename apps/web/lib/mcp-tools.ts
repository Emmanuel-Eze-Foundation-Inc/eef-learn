import { slugifyTopic, titleFromTopic } from "@eef/core";
import { prisma } from "@eef/db";
import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";

import { BLOCK_TYPES, blockMeta } from "./blocks";
import { agentOpSchema, agentSnapshot, applyAgentOps } from "./course-agent";
import { env } from "./env";

export type McpCaller = { userId: string; client: string };

const origin = env.AUTH_URL.replace(/\/$/, "");

const INSTRUCTIONS = `EEF Learn hosts learning maps: courses made of modules and lessons, each lesson a list of content blocks.
You build and edit the caller's maps with your own model; EEF Learn adds no AI and no usage limits.
Build a course the way the course-create skill does: research how the topic is taught, add modules first
(add_lesson with parent null), then lessons under each module, then fill every lesson with blocks:
a reading (ai_text), a real YouTube video you found (never invent a video id), and a quiz or flashcard.
Read the map with get_map before editing, and send edits in batches with edit_map.`;

const blockGuide = BLOCK_TYPES.map((type) => {
  const meta = blockMeta(type);
  const parts = [meta.label, meta.needsUrl ? `url required (${meta.urlHint})` : meta.urlHint ? `url optional (${meta.urlHint})` : null, meta.bodyHint ? `body: ${meta.bodyHint}` : null];
  return `- ${type}: ${parts.filter(Boolean).join("; ")}`;
}).join("\n");

const mapRef = z.string().min(1).describe("The map's id or slug, from list_my_maps or create_map.");

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

function links(slug: string) {
  return { studio: `${origin}/maps/${slug}/studio`, learn: `${origin}/maps/${slug}`, share: `${origin}/share/${slug}` };
}

async function ownMap(userId: string, ref: string) {
  return prisma.map.findFirst({
    where: { creatorId: userId, OR: [{ id: ref }, { slug: ref }] },
    select: { id: true, slug: true, title: true, visibility: true, version: true },
  });
}

const NOT_YOURS = "No map you created matches that id or slug. Call list_my_maps to see yours.";

/** One MCP server per request, scoped to the signed-in creator behind the access token. */
export function buildMcpServer(caller: McpCaller): McpServer {
  const server = new McpServer({ name: "eef-learn", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "list_my_maps",
    {
      title: "List my maps",
      description: "Maps the signed-in user created, newest first, with their visibility and lesson count.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const maps = await prisma.map.findMany({
        where: { creatorId: caller.userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, slug: true, title: true, visibility: true, updatedAt: true, _count: { select: { nodes: true } } },
      });
      return ok(
        maps.map((m) => ({ id: m.id, slug: m.slug, title: m.title, visibility: m.visibility, lessons: m._count.nodes, updatedAt: m.updatedAt, links: links(m.slug) })),
      );
    },
  );

  server.registerTool(
    "get_map",
    {
      title: "Read a map",
      description: "The map's modules and lessons in travel order (depth 0 = module), each block with a short preview, and the prerequisite links.",
      inputSchema: z.object({ map: mapRef }),
      annotations: { readOnlyHint: true },
    },
    async ({ map: ref }) => {
      const map = await ownMap(caller.userId, ref);
      if (!map) return fail(NOT_YOURS);
      const snapshot = await agentSnapshot(map.id);
      return ok({ id: map.id, slug: map.slug, visibility: map.visibility, links: links(map.slug), ...snapshot });
    },
  );

  server.registerTool(
    "get_lesson",
    {
      title: "Read a lesson",
      description: "Every block in one lesson with its full body and url, for rewriting a block with edit_map.",
      inputSchema: z.object({ map: mapRef, lesson: z.string().min(1).describe("The lesson's slug, from get_map.") }),
      annotations: { readOnlyHint: true },
    },
    async ({ map: ref, lesson }) => {
      const map = await ownMap(caller.userId, ref);
      if (!map) return fail(NOT_YOURS);
      const node = await prisma.node.findFirst({
        where: { mapId: map.id, slug: lesson },
        include: { contentBlocks: { where: { mapVersion: map.version }, orderBy: { blockIndex: "asc" } } },
      });
      if (!node) return fail(`No lesson "${lesson}" in this map. Call get_map for the lesson slugs.`);
      return ok({
        slug: node.slug,
        title: node.title,
        blocks: node.contentBlocks.map((b) => ({ id: b.id, type: b.type, title: b.title, body: b.body, url: b.url, optional: b.optional, durationSeconds: b.durationSeconds })),
      });
    },
  );

  server.registerTool(
    "create_map",
    {
      title: "Create a map",
      description: "Start an empty, private map on a topic. Then add modules, lessons and blocks with edit_map.",
      inputSchema: z.object({
        topic: z.string().trim().min(2).max(200).describe("What the course teaches, e.g. 'Intro to AI engineering'."),
        title: z.string().trim().min(2).max(200).optional().describe("Display title; defaults to the topic."),
      }),
    },
    async ({ topic, title }) => {
      const map = await prisma.map.create({
        data: { slug: slugifyTopic(topic), title: title ?? titleFromTopic(topic), topic, creatorId: caller.userId },
      });
      return ok({ id: map.id, slug: map.slug, title: map.title, visibility: map.visibility, links: links(map.slug) });
    },
  );

  server.registerTool(
    "edit_map",
    {
      title: "Edit a map",
      description: `Apply a batch of edits to one of the user's maps, in order, in one transaction. Ops that don't fit (unknown slug or id, a loop, a bad link, an unfinished block) are skipped and listed with the reason.

Ops:
- add_lesson {slug, title, parent}: parent null makes a module; otherwise the parent's slug.
- update_lesson {slug, title?, parent?} / remove_lesson {slug}
- add_block {lesson, type, title?, body?, url?, sourceName?, sourceUrl?, optional?}: optional marks a deep dive outside the core time.
- update_block {id, title?, body?, url?, optional?} / remove_block {id}
- add_prerequisite {from, to} / remove_prerequisite {from, to}: "to" builds on "from".

Block types:
${blockGuide}`,
      inputSchema: z.object({ map: mapRef, ops: z.array(agentOpSchema).min(1).max(200) }),
    },
    async ({ map: ref, ops }) => {
      const map = await ownMap(caller.userId, ref);
      if (!map) return fail(NOT_YOURS);
      const { changes, skipped } = await applyAgentOps(map.id, ops, `mcp:${caller.client}`);
      return ok({ applied: changes.length, changes: changes.map((c) => c.label), skipped, links: links(map.slug) });
    },
  );

  server.registerTool(
    "set_visibility",
    {
      title: "Publish or unpublish a map",
      description: "public: listed in community maps. unlisted: anyone with the link. private: the user and learners they approve.",
      inputSchema: z.object({ map: mapRef, visibility: z.enum(["private", "unlisted", "public"]) }),
    },
    async ({ map: ref, visibility }) => {
      const map = await ownMap(caller.userId, ref);
      if (!map) return fail(NOT_YOURS);
      await prisma.map.update({ where: { id: map.id }, data: { visibility } });
      return ok({ id: map.id, slug: map.slug, visibility, links: links(map.slug) });
    },
  );

  return server;
}
