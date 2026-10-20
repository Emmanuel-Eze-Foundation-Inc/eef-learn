import { prisma } from "@eef/db";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";

/** DELETE /api/me/ai-apps/:clientId — disconnect an MCP client: its consent and refresh tokens go. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { clientId } = await params;
  const where = { userId: session.user.id, clientId: decodeURIComponent(clientId) };
  await prisma.$transaction([
    prisma.oauthConsent.deleteMany({ where }),
    prisma.oauthAccessToken.deleteMany({ where }),
    prisma.oauthRefreshToken.deleteMany({ where }),
  ]);
  return NextResponse.json({ ok: true });
}
