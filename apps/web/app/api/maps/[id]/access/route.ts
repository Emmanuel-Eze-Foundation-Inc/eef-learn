import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

async function loadMap(id: string) {
  return prisma.map.findUnique({ where: { id }, select: { id: true, creatorId: true, visibility: true } });
}

const requestSchema = z.object({ message: z.string().trim().max(500).optional() });

/** POST /api/maps/:id/access — ask the creator of a private map to let you in. */
export async function POST(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to request access." }, { status: 401 });
  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Keep the note under 500 characters." }, { status: 422 });

  const map = await loadMap((await params).id);
  if (!map) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (map.creatorId === session.user.id) return NextResponse.json({ status: "approved" });
  if (map.visibility === "public") return NextResponse.json({ status: "approved" });

  const existing = await prisma.mapAccess.findUnique({
    where: { mapId_userId: { mapId: map.id, userId: session.user.id } },
  });
  if (existing?.status === "approved") return NextResponse.json({ status: "approved" });

  const access = await prisma.mapAccess.upsert({
    where: { mapId_userId: { mapId: map.id, userId: session.user.id } },
    create: { mapId: map.id, userId: session.user.id, message: parsed.data.message || null },
    update: { status: "pending", message: parsed.data.message || null },
  });
  return NextResponse.json({ status: access.status });
}

const decideSchema = z.object({ userId: z.string().min(1), status: z.enum(["approved", "declined"]) });

/** PATCH /api/maps/:id/access — the creator approves or declines a request. */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = decideSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });

  const map = await loadMap((await params).id);
  if (!map) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (map.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Only the creator can decide who gets in." }, { status: 403 });
  }

  const updated = await prisma.mapAccess.updateMany({
    where: { mapId: map.id, userId: parsed.data.userId },
    data: { status: parsed.data.status },
  });
  if (updated.count === 0) return NextResponse.json({ error: "That request no longer exists." }, { status: 404 });
  return NextResponse.json({ status: parsed.data.status });
}

const removeSchema = z.object({ userId: z.string().min(1).optional() });

/**
 * DELETE /api/maps/:id/access — without a userId you leave the map (your
 * access and progress go); with one, the creator removes that learner's access.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = removeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });

  const map = await loadMap((await params).id);
  if (!map) return NextResponse.json({ error: "not found" }, { status: 404 });
  const target = parsed.data.userId ?? session.user.id;

  if (target !== session.user.id) {
    if (map.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can remove learners." }, { status: 403 });
    }
    await prisma.mapAccess.deleteMany({ where: { mapId: map.id, userId: target } });
    return NextResponse.json({ ok: true });
  }

  if (map.creatorId === session.user.id) {
    await prisma.progress.deleteMany({ where: { mapId: map.id, userId: target } });
    return NextResponse.json({ ok: true });
  }
  await prisma.$transaction([
    prisma.progress.deleteMany({ where: { mapId: map.id, userId: target } }),
    prisma.mapAccess.deleteMany({ where: { mapId: map.id, userId: target } }),
  ]);
  return NextResponse.json({ ok: true });
}
