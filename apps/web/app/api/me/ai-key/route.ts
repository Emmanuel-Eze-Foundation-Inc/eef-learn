import { prisma } from "@eef/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_PROVIDER_IDS, aiKeyProblem } from "@/lib/ai-providers";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { encryptUserApiKey, userModelSummary } from "@/lib/user-ai-key";

const bodySchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  /** omitted: keep the stored key and change only the provider's model */
  key: z.string().trim().max(256).optional(),
  model: z
    .string()
    .trim()
    .max(120)
    .regex(/^[\w.:/-]*$/, "Model ids use letters, numbers, dots, dashes, colons and slashes.")
    .optional(),
});

/** GET: which provider and model the user brought. Never returns the key. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await userModelSummary(session.user.id);
  return NextResponse.json({ configured: Boolean(summary), ...summary, mock: env.AI_PROVIDER === "mock" });
}

/** POST: store or replace the user's model key (encrypted), its provider, and an optional model. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid key." }, { status: 422 });
  }
  const { provider, key, model } = parsed.data;
  const current = await userModelSummary(session.user.id);
  if (!key && current?.provider !== provider) {
    return NextResponse.json({ error: "Paste a key for this provider." }, { status: 422 });
  }
  const keyError = key ? aiKeyProblem(provider, key) : null;
  if (keyError) return NextResponse.json({ error: keyError }, { status: 422 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(key ? { aiKeyCipher: encryptUserApiKey(key) } : {}),
      aiKeyProvider: provider,
      aiKeyModel: model || null,
    },
  });
  return NextResponse.json({ configured: true, provider, model: model || null });
}

/** DELETE: forget the stored key. */
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiKeyCipher: null, aiKeyProvider: null, aiKeyModel: null },
  });
  return NextResponse.json({ configured: false });
}
