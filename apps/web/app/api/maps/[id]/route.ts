import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";

const patchSchema = z.object({
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

  const updated = await prisma.map.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ visibility: updated.visibility });
}
