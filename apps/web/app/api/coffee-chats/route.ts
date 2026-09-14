import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";

const bodySchema = z.object({
  mapId: z.string().min(1),
  availability: z.string().trim().min(1).max(500),
  note: z.string().trim().max(2000).optional(),
});

/**
 * POST /api/coffee-chats (ticket T13, UC-2): learner requests a 30-minute
 * coffee chat after completing a map. EEF admins match manually from the
 * alumni pool — there is intentionally no matching engine in v1.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });
  const { mapId, availability, note } = parsed.data;

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: {
      nodes: { select: { id: true } },
      progress: { where: { userId: session.user.id, mastered: true } },
    },
  });
  if (!map) return NextResponse.json({ error: "not found" }, { status: 404 });

  const completed =
    map.nodes.length > 0 && map.progress.length >= map.nodes.length;
  if (!completed) {
    return NextResponse.json(
      { error: "Finish every star on this map first — then we'll set up your chat." },
      { status: 409 },
    );
  }

  const existing = await prisma.coffeeChatRequest.findFirst({
    where: { userId: session.user.id, mapId, status: "open" },
  });
  if (existing) return NextResponse.json({ request: existing });

  const request = await prisma.coffeeChatRequest.create({
    data: { userId: session.user.id, mapId, availability, note: note || null },
  });
  return NextResponse.json({ request }, { status: 201 });
}
