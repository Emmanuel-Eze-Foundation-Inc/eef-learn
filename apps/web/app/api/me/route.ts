import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { profileSchema } from "@/lib/profile";
import { getSession } from "@/lib/session";

const patchSchema = profileSchema
  .partial()
  .extend({ learningPathPublic: z.boolean().optional() })
  .refine((body) => Object.keys(body).length > 0, "Nothing to save.");

/** PATCH /api/me — the signed-in person's own profile and settings. */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      name: true,
      image: true,
      headline: true,
      bio: true,
      location: true,
      website: true,
      learningPathPublic: true,
    },
  });
  return NextResponse.json(user);
}
