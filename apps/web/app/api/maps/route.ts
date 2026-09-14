import { slugifyTopic, titleFromTopic } from "@eef/core";
import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeQuota } from "@/lib/quota";
import { getSession } from "@/lib/session";

const createMapSchema = z.object({
  topic: z.string().trim().min(2).max(200),
});

/** POST /api/maps — create a Map shell + enqueue the skeleton job (ticket T7). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createMapSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "topic must be 2-200 characters" }, { status: 422 });
  }
  const { topic } = parsed.data;

  const ok = await consumeQuota(session.user.id, "maps_per_day");
  if (!ok) {
    return NextResponse.json(
      { error: "You've reached today's new-map limit. It resets at midnight UTC." },
      { status: 429 },
    );
  }

  const map = await prisma.map.create({
    data: {
      slug: slugifyTopic(topic),
      title: titleFromTopic(topic),
      topic,
      creatorId: session.user.id,
    },
  });
  const job = await prisma.generationJob.create({
    data: {
      id: `job_${createId()}`,
      kind: "skeleton",
      userId: session.user.id,
      mapId: map.id,
      payload: { topic, mapId: map.id },
    },
  });

  return NextResponse.json({ mapId: map.id, slug: map.slug, jobId: job.id }, { status: 201 });
}
