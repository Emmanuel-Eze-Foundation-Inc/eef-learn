import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { problem, publicHttpUrlError } from "@/lib/map-author";
import { getSession } from "@/lib/session";

const types = ["youtube", "blog", "ai_text", "pdf_extract", "flashcard", "quiz"] as const;

const createSchema = z.object({
  type: z.enum(types),
  title: z.string().trim().max(160).optional(),
  body: z.string().max(20000).nullable().optional(),
  url: z.string().max(500).nullable().optional(),
});

const patchSchema = z.object({
  blockId: z.string(),
  title: z.string().trim().max(160).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
  url: z.string().max(500).nullable().optional(),
  blockIndex: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({ blockId: z.string() });

async function requireCreatorNode(nodeId: string, userId: string) {
  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    include: { map: true, contentBlocks: { orderBy: { blockIndex: "asc" } } },
  });
  if (!node) return { node: null, error: problem(404, "not found") };
  if (node.map.creatorId !== userId) {
    return { node: null, error: problem(403, "only the creator can edit this map") };
  }
  return { node, error: null };
}

/** POST /api/nodes/:id/blocks — add a content beat. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid block");

  const loaded = await requireCreatorNode(id, session.user.id);
  if (loaded.error || !loaded.node) return loaded.error;
  const { node } = loaded;

  const url = parsed.data.url?.trim() || null;
  if (url && (parsed.data.type === "youtube" || parsed.data.type === "blog")) {
    const urlError = publicHttpUrlError(url);
    if (urlError) return problem(422, urlError);
  }

  const versionBlocks = node.contentBlocks.filter((b) => b.mapVersion === node.map.version);
  const blockIndex = versionBlocks.reduce((max, b) => Math.max(max, b.blockIndex), -1) + 1;
  const block = await prisma.contentBlock.create({
    data: {
      id: `blk_${createId()}`,
      nodeId: id,
      blockIndex,
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      url,
      mapVersion: node.map.version,
    },
  });
  return NextResponse.json({ block }, { status: 201 });
}

/** PATCH /api/nodes/:id/blocks — edit a beat. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "invalid body");

  const loaded = await requireCreatorNode(id, session.user.id);
  if (loaded.error || !loaded.node) return loaded.error;
  const block = loaded.node.contentBlocks.find((b) => b.id === parsed.data.blockId);
  if (!block) return problem(404, "not found");

  if (parsed.data.url) {
    const urlError = publicHttpUrlError(parsed.data.url);
    if (urlError) return problem(422, urlError);
  }

  const updated = await prisma.contentBlock.update({
    where: { id: block.id },
    data: {
      title: parsed.data.title === undefined ? undefined : parsed.data.title,
      body: parsed.data.body === undefined ? undefined : parsed.data.body,
      url: parsed.data.url === undefined ? undefined : parsed.data.url,
      blockIndex: parsed.data.blockIndex,
    },
  });
  return NextResponse.json({ block: updated });
}

/** DELETE /api/nodes/:id/blocks — remove a beat. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "blockId is required");

  const loaded = await requireCreatorNode(id, session.user.id);
  if (loaded.error || !loaded.node) return loaded.error;
  const block = loaded.node.contentBlocks.find((b) => b.id === parsed.data.blockId);
  if (!block) return problem(404, "not found");

  await prisma.contentBlock.delete({ where: { id: block.id } });
  return NextResponse.json({ ok: true });
}
