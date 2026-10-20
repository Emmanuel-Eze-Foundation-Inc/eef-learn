import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { canTravel } from "@/lib/map-access";
import { getSession } from "@/lib/session";
import { modelRequired } from "@/lib/model-required";
import { tutorSystemPrompt } from "@/lib/tutor";
import { getUserModel } from "@/lib/user-ai-key";

const bodySchema = z.object({
  mapId: z.string().min(1),
  nodeId: z.string().optional(),
  message: z.string().trim().min(1).max(4000),
});

/**
 * POST /api/companion (ticket T12): persist the learner's message, call the AI
 * service /chat with progress-aware context, persist and return the reply.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });
  const { mapId, nodeId, message } = parsed.data;

  const userModel = await getUserModel(session.user.id);
  if (!userModel && env.AI_PROVIDER !== "mock") return modelRequired("ask the tutor");

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: {
      nodes: { orderBy: { order: "asc" }, select: { id: true, title: true } },
      progress: { where: { userId: session.user.id } },
    },
  });
  if (!map || !(await canTravel(map, session.user.id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let thread = await prisma.companionThread.findFirst({
    where: { userId: session.user.id, mapId },
  });
  thread ??= await prisma.companionThread.create({
    data: { userId: session.user.id, mapId },
  });

  await prisma.message.create({
    data: { threadId: thread.id, role: "user", content: message },
  });

  const history = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const mastered = map.progress.filter((p) => p.mastered).length;
  const currentNode = nodeId ? map.nodes.find((n) => n.id === nodeId) : undefined;
  const system = tutorSystemPrompt({
    learner: session.user.name,
    mapTitle: map.title,
    mastered,
    total: map.nodes.length,
    lessonTitle: currentNode?.title,
  });

  const res = await fetch(`${env.AI_SERVICE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      userModel,
      messages: [
        { role: "system", content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  }).catch(() => null);
  if (!res?.ok) {
    return NextResponse.json({ error: "Owlbert lost the signal. Try again in a moment." }, { status: 502 });
  }
  const { reply } = await res.json();

  await prisma.message.create({
    data: { threadId: thread.id, role: "assistant", content: reply },
  });

  return NextResponse.json({ reply });
}
