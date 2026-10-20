import {
  isMapBrief,
  slugifyTopic,
  titleFromTopic,
  type MapBrief,
} from "@eef/core";
import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { modelRequired } from "@/lib/model-required";
import { getUserModel, sealForJob } from "@/lib/user-ai-key";

const briefSchema = z
  .object({
    audience: z.string().max(200).optional(),
    startingPoint: z.string().max(200).optional(),
    depth: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
  })
  .optional();

const UNTITLED = "Untitled course";

const createMapSchema = z
  .object({
    topic: z.string().trim().max(200).optional(),
    mode: z.enum(["generate", "blank"]).default("generate"),
    brief: briefSchema,
  })
  .refine((d) => d.mode === "blank" || (d.topic?.length ?? 0) >= 2);

/** POST /api/maps — create a Map shell; generate enqueues skeleton, blank is an empty course for the studio. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createMapSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "topic must be 2-200 characters" }, { status: 422 });
  }
  const { mode } = parsed.data;
  const topic = parsed.data.topic && parsed.data.topic.length >= 2 ? parsed.data.topic : UNTITLED;
  const brief: MapBrief | undefined = parsed.data.brief && isMapBrief(parsed.data.brief)
    ? parsed.data.brief
    : undefined;

  const userModel = mode === "generate" ? await getUserModel(session.user.id) : null;
  if (mode === "generate" && !userModel && env.AI_PROVIDER !== "mock") return modelRequired("build a map");

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
        payload: { topic, brief: brief ?? {}, mapId: map.id, userModel: userModel ? sealForJob(userModel) : null },
      },
    });

    return NextResponse.json({ mapId: map.id, slug: map.slug, jobId: job.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start your map.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
