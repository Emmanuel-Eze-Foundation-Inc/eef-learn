import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { graphProblems, problem, requireCreatorMap, uniqueNodeSlug } from "@/lib/map-author";
import { getSession } from "@/lib/session";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  parentId: z.string().nullable().optional(),
});

const patchSchema = z.object({
  nodeId: z.string(),
  title: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({ nodeId: z.string() });

/** POST /api/maps/:id/nodes — add a lesson node. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "title is required");

  const loaded = await requireCreatorMap(id, session.user.id);
  if (loaded.error || !loaded.map) return loaded.error;
  const { map } = loaded;

  if (parsed.data.parentId && !map.nodes.some((n) => n.id === parsed.data.parentId)) {
    return problem(422, "parent is missing", "That parent is not on this map.", "Pick a node on this map.");
  }

  const siblings = map.nodes.filter((n) => n.parentId === (parsed.data.parentId ?? null));
  const order = siblings.reduce((max, n) => Math.max(max, n.order), -1) + 1;
  const slug = await uniqueNodeSlug(id, parsed.data.title);
  const node = await prisma.node.create({
    data: {
      id: `node_${createId()}`,
      mapId: id,
      slug,
      title: parsed.data.title,
      order,
      parentId: parsed.data.parentId ?? null,
    },
  });
  return NextResponse.json({ node }, { status: 201 });
}

/** PATCH /api/maps/:id/nodes — rename, nest, or reorder a node. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid body");

  const loaded = await requireCreatorMap(id, session.user.id);
  if (loaded.error || !loaded.map) return loaded.error;
  const { map } = loaded;
  const current = map.nodes.find((n) => n.id === parsed.data.nodeId);
  if (!current) return problem(404, "not found");

  const nextParent = parsed.data.parentId === undefined ? current.parentId : parsed.data.parentId;
  const nextNodes = map.nodes.map((n) =>
    n.id === current.id
      ? { ...n, parentId: nextParent, order: parsed.data.order ?? n.order }
      : n,
  );
  const problems = graphProblems(nextNodes, map.edges);
  if (problems.length) {
    return problem(422, problems[0], "That nest would break the path.", "Choose a different parent.");
  }

  const node = await prisma.node.update({
    where: { id: current.id },
    data: {
      title: parsed.data.title,
      parentId: parsed.data.parentId === undefined ? undefined : parsed.data.parentId,
      order: parsed.data.order,
    },
  });
  return NextResponse.json({ node });
}

/** DELETE /api/maps/:id/nodes — remove a node (children become roots). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "nodeId is required");

  const loaded = await requireCreatorMap(id, session.user.id);
  if (loaded.error || !loaded.map) return loaded.error;
  if (!loaded.map.nodes.some((n) => n.id === parsed.data.nodeId)) return problem(404, "not found");

  await prisma.node.delete({ where: { id: parsed.data.nodeId } });
  return NextResponse.json({ ok: true });
}
