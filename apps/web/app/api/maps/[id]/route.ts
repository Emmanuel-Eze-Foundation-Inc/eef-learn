import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  visibility: z.enum(["private", "unlisted", "public"]).optional(),
  generationEnabled: z.boolean().optional(),
  regenerationEnabled: z.boolean().optional(),
});

/** PATCH /api/maps/:id — creator-only map settings (ticket T11: publish). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });

  const map = await prisma.map.findUnique({ where: { id }, select: { creatorId: true } });
  if (!map) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (map.creatorId !== session.user.id) {
    return NextResponse.json({ error: "only the creator can change map settings" }, { status: 403 });
  }

  const { title, ...settings } = parsed.data;
  const updated = await prisma.map.update({
    where: { id },
    data: { ...settings, ...(title ? { title, topic: title } : {}) },
  });
  return NextResponse.json({ title: updated.title, visibility: updated.visibility });
}

/** DELETE /api/maps/:id — creator-only; lessons, progress, and access go with it. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const map = await prisma.map.findUnique({
    where: { id },
    select: { creatorId: true, _count: { select: { usedIn: true } } },
  });
  if (!map) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (map.creatorId !== session.user.id) {
    return NextResponse.json({ error: "only the creator can delete this map" }, { status: 403 });
  }
  if (map._count.usedIn > 0) {
    return NextResponse.json(
      { error: "Another map is built on this one, so it can't be deleted. Make it private instead." },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.companionThread.deleteMany({ where: { mapId: id } }),
    prisma.coffeeChatRequest.deleteMany({ where: { mapId: id } }),
    prisma.generationJob.deleteMany({ where: { mapId: id } }),
    prisma.map.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
