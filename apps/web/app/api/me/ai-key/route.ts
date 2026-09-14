import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import {
  encryptUserApiKey,
  looksLikeOpenRouterKey,
  userHasApiKey,
} from "@/lib/user-ai-key";
import { prisma } from "@eef/db";

const bodySchema = z.object({
  key: z.string().min(20).max(256),
});

/** GET: whether this learner has a stored OpenRouter key. Never returns the secret. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    configured: await userHasApiKey(session.user.id),
    mock: env.AI_PROVIDER === "mock",
  });
}

/** POST: store (or replace) the learner's OpenRouter key, encrypted. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !looksLikeOpenRouterKey(parsed.data.key)) {
    return NextResponse.json(
      { error: "That does not look like an OpenRouter key. It should start with sk-or-." },
      { status: 422 },
    );
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { openRouterKeyCipher: encryptUserApiKey(parsed.data.key.trim()) },
  });
  return NextResponse.json({ configured: true });
}

/** DELETE: forget the stored key. */
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { openRouterKeyCipher: null },
  });
  return NextResponse.json({ configured: false });
}
