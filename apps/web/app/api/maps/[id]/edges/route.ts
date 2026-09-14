import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { graphProblems, problem, requireCreatorMap } from "@/lib/map-author";
import { getSession } from "@/lib/session";

const createSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
});

const deleteSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
});

/** POST /api/maps/:id/edges — add a prerequisite. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "fromId and toId are required");

  const loaded = await requireCreatorMap(id, session.user.id);
  if (loaded.error || !loaded.map) return loaded.error;
  const { map } = loaded;
  const ids = new Set(map.nodes.map((n) => n.id));
  if (!ids.has(parsed.data.fromId) || !ids.has(parsed.data.toId)) {
    return problem(422, "edge references a missing node");
  }

  const nextEdges = [
    ...map.edges,
    { fromId: parsed.data.fromId, toId: parsed.data.toId, kind: "prerequisite" },
  ];
  const problems = graphProblems(map.nodes, nextEdges);
  if (problems.length) {
    return problem(422, problems[0], "That link would loop the path.", "Pick a different pair.");
  }

  const edge = await prisma.edge.create({
    data: {
      id: `edge_${createId()}`,
      mapId: id,
      fromId: parsed.data.fromId,
      toId: parsed.data.toId,
      kind: "prerequisite",
    },
  });
  return NextResponse.json({ edge }, { status: 201 });
}

/** DELETE /api/maps/:id/edges — remove a prerequisite. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "fromId and toId are required");

  const loaded = await requireCreatorMap(id, session.user.id);
  if (loaded.error || !loaded.map) return loaded.error;

  await prisma.edge.deleteMany({
    where: {
      mapId: id,
      fromId: parsed.data.fromId,
      toId: parsed.data.toId,
      kind: "prerequisite",
    },
  });
  return NextResponse.json({ ok: true });
}
