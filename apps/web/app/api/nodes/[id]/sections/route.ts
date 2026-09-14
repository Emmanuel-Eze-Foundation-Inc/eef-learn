import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { getUserApiKey } from "@/lib/user-ai-key";

/**
 * POST /api/nodes/:id/sections — enqueue a section-generation job (ticket T10).
 * The sections_per_day quota is enforced atomically inside the pipeline.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const node = await prisma.node.findUnique({ where: { id }, include: { map: true } });
  if (!node) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (node.map.creatorId !== session.user.id) {
    return NextResponse.json({ error: "only the map creator can generate content" }, { status: 403 });
  }
  if (!node.map.generationEnabled) {
    return NextResponse.json({ error: "generation is disabled for this map" }, { status: 403 });
  }

  // Dedup: reuse an already active job for this node
  const active = await prisma.generationJob.findFirst({
    where: { nodeId: id, kind: "section", status: { in: ["queued", "running"] } },
  });
  if (active) return NextResponse.json({ jobId: active.id }, { status: 200 });

  const userApiKey = await getUserApiKey(session.user.id);
  if (!userApiKey && env.AI_PROVIDER !== "mock") {
    return NextResponse.json(
      {
        error: "openrouter_key_required",
        message: "Add your OpenRouter key to generate a section.",
      },
      { status: 409 },
    );
  }

  const job = await prisma.generationJob.create({
    data: {
      id: `job_${createId()}`,
      kind: "section",
      userId: session.user.id,
      mapId: node.mapId,
      nodeId: node.id,
      payload: {
        mapId: node.mapId,
        nodeId: node.id,
        topic: node.map.topic,
        nodeTitle: node.title,
        nodeSlug: node.slug,
        mapVersion: node.map.version,
        userApiKey,
      },
    },
  });
  return NextResponse.json({ jobId: job.id }, { status: 201 });
}
