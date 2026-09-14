import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";

const progressSchema = z.object({
  nodeId: z.string().min(1),
  mastered: z.boolean().optional(),
  blocksDone: z.number().int().min(0).optional(),
});

/** POST /api/progress — upsert the caller's progress on a node (ticket T10). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = progressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });
  const { nodeId, mastered, blocksDone } = parsed.data;

  const node = await prisma.node.findUnique({ where: { id: nodeId }, include: { map: true } });
  if (!node) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (node.map.visibility !== "public" && node.map.creatorId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.progress.upsert({
    where: { userId_nodeId: { userId: session.user.id, nodeId } },
    create: {
      userId: session.user.id,
      mapId: node.mapId,
      nodeId,
      mapVersion: node.map.version,
      mastered: mastered ?? false,
      blocksDone: blocksDone ?? 0,
    },
    update: {
      ...(mastered !== undefined ? { mastered } : {}),
      ...(blocksDone !== undefined ? { blocksDone } : {}),
    },
  });

  // map completion check (feeds the completion overlay)
  const [nodeCount, masteredCount] = await Promise.all([
    prisma.node.count({ where: { mapId: node.mapId } }),
    prisma.progress.count({ where: { userId: session.user.id, mapId: node.mapId, mastered: true } }),
  ]);

  return NextResponse.json({
    progress: { nodeId: progress.nodeId, mastered: progress.mastered },
    mapComplete: nodeCount > 0 && masteredCount === nodeCount,
  });
}
