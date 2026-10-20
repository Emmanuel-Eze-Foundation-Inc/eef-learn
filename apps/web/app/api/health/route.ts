import { prisma } from "@eef/db";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Uptime check: the database and the AI service (tutor, course agent, job worker). */
export async function GET() {
  const [db, ai] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    ),
    fetch(`${env.AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000), cache: "no-store" }).then(
      (res) => res.ok,
      () => false,
    ),
  ]);
  return NextResponse.json({ ok: db && ai, service: "web", db, ai }, { status: db && ai ? 200 : 503 });
}
