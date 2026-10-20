import { NextResponse } from "next/server";

import { loadCourse } from "@/lib/course";
import { problem } from "@/lib/map-author";
import { getSession } from "@/lib/session";

/** GET /api/maps/:id/course — the creator's live course, for the studio to resync. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const course = await loadCourse({ id }, session.user.id);
  if (!course || !course.isCreator) return problem(404, "not found");
  return NextResponse.json({ course });
}
