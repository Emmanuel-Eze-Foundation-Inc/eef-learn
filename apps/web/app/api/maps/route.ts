import { isMapBrief, slugifyTopic, titleFromTopic, type MapBrief } from "@eef/core";
import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { consumeQuota } from "@/lib/quota";
import { getSession } from "@/lib/session";
import { getUserApiKey } from "@/lib/user-ai-key";

const briefSchema = z
  .object({
    audience: z.string().max(200).optional(),
    startingPoint: z.string().max(200).optional(),
    depth: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
  })
  .optional();

const createMapSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  mode: z.enum(["generate", "blank"]).default("generate"),
  brief: briefSchema,
});

/** POST /api/maps — create a Map shell; generate enqueues skeleton, blank opens studio. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createMapSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "topic must be 2-200 characters" }, { status: 422 });
  }
  const { topic, mode } = parsed.data;
  const brief: MapBrief | undefined = parsed.data.brief && isMapBrief(parsed.data.brief)
    ? parsed.data.brief
    : undefined;

  const userApiKey = await getUserApiKey(session.user.id);
  if (mode === "generate" && !userApiKey && env.AI_PROVIDER !== "mock") {
    return NextResponse.json(
      {
        error: "openrouter_key_required",
        message: "Add your OpenRouter key to build a map. We store it encrypted and use it only for your generations.",
      },
      { status: 409 },
    );
  }

  const ok = await consumeQuota(session.user.id, "maps_per_day");
  if (!ok) {
    return NextResponse.json(
      { error: "You've reached today's new-map limit. It resets at midnight UTC." },
      { status: 429 },
    );
  }

  try {
    const map = await prisma.map.create({
      data: {
        slug: slugifyTopic(topic),
        title: titleFromTopic(topic),
        topic,
        brief: brief ?? undefined,
        creatorId: session.user.id,
      },
    });

    if (mode === "blank") {
      return NextResponse.json({ mapId: map.id, slug: map.slug, jobId: null }, { status: 201 });
    }

    const job = await prisma.generationJob.create({
      data: {
        id: `job_${createId()}`,
        kind: "skeleton",
        userId: session.user.id,
        mapId: map.id,
        payload: { topic, brief: brief ?? {}, mapId: map.id, userApiKey },
      },
    });

    return NextResponse.json({ mapId: map.id, slug: map.slug, jobId: job.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start your map.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
