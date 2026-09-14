import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin";

const postSchema = z.object({
  kind: z.enum(["partnership", "volunteer"]),
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "invalid email"),
  organization: z.string().trim().max(200).optional(),
  volunteerIntent: z.enum(["lead_series", "host_event"]).optional(),
  context: z.string().trim().max(240).optional(),
  message: z.string().trim().min(8).max(4000),
  website: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "closed"]),
});

/** POST /api/inquiries — public partnership / volunteer notes. */
export async function POST(req: Request) {
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the fields and try again." }, { status: 422 });

  const { website, ...body } = parsed.data;
  if (website) return NextResponse.json({ ok: true });

  if (body.kind === "partnership" && !body.organization) {
    return NextResponse.json({ error: "Organization is required for a partnership note." }, { status: 422 });
  }
  if (body.kind === "volunteer" && !body.volunteerIntent) {
    return NextResponse.json({ error: "Choose whether you will lead a series or host an event." }, { status: 422 });
  }

  const recent = await prisma.inquiry.findFirst({
    where: { email: body.email, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent) {
    return NextResponse.json({ error: "You just sent one. Wait a minute and try again." }, { status: 429 });
  }

  await prisma.inquiry.create({
    data: {
      kind: body.kind,
      name: body.name,
      email: body.email,
      organization: body.kind === "partnership" ? body.organization : null,
      volunteerIntent: body.kind === "volunteer" ? body.volunteerIntent : null,
      context: body.context || null,
      message: body.message,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** GET /api/inquiries — admin inbox. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ inquiries });
}

/** PATCH /api/inquiries — admin open/closed. */
export async function PATCH(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 422 });

  const inquiry = await prisma.inquiry.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ inquiry });
}
