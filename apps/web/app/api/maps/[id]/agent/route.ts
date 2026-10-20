import { NextResponse } from "next/server";
import { z } from "zod";

import { agentSnapshot, applyAgentOps } from "@/lib/course-agent";
import { loadCourse } from "@/lib/course";
import { env } from "@/lib/env";
import { problem, requireCreatorMap } from "@/lib/map-author";
import { getSession } from "@/lib/session";
import { modelRequired } from "@/lib/model-required";
import { getUserModel } from "@/lib/user-ai-key";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  focusSlug: z.string().max(120).nullable().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(16)
    .optional(),
});

/**
 * POST /api/maps/:id/agent — one course-agent turn. The AI service decides the
 * edits; this route checks ownership, applies them, and returns the new course.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(422, "message is required");

  const loaded = await requireCreatorMap(id, session.user.id);
  if (loaded.error) return loaded.error;

  const userModel = await getUserModel(session.user.id);
  if (!userModel && env.AI_PROVIDER !== "mock") return modelRequired("use the course agent");

  const course = await agentSnapshot(id);
  if (!course) return problem(404, "not found");

  const res = await fetch(`${env.AI_SERVICE_URL}/agent/course-edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_SERVICE_TOKEN}` },
    body: JSON.stringify({
      userModel,
      course,
      message: parsed.data.message,
      focus: parsed.data.focusSlug ?? null,
      history: parsed.data.history ?? [],
    }),
  }).catch(() => null);
  if (!res?.ok) {
    const detail = res ? await res.json().catch(() => null) : null;
    return problem(502, "The course agent is unavailable right now.", detail?.detail ?? undefined, "Try again in a moment.");
  }
  const result = (await res.json()) as { reply?: string; ops?: unknown[]; model?: string };

  const { changes, skipped } = await applyAgentOps(id, Array.isArray(result.ops) ? result.ops : [], result.model ?? null);
  const fresh = await loadCourse({ id }, session.user.id);

  return NextResponse.json({ reply: result.reply ?? "Done.", changes, skipped, course: fresh });
}
