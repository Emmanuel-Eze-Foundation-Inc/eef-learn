import { prisma } from "@eef/db";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";

/**
 * GET /api/jobs/:id?after=N — checkpoint polling (PLAN.md M2: polling, not SSE,
 * because hosted Postgres poolers break LISTEN/NOTIFY). `after` is the resume
 * token: only checkpoints past that index are returned.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id },
    select: { id: true, status: true, checkpoints: true, error: true, userId: true },
  });
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const all = Array.isArray(job.checkpoints) ? job.checkpoints : [];
  return NextResponse.json({
    status: job.status,
    error: job.error,
    checkpoints: all.slice(after),
    nextAfter: all.length,
  });
}
