import { notFound, redirect } from "next/navigation";

import { loadCourse } from "@/lib/course";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { userModelSummary } from "@/lib/user-ai-key";

import { CourseStudio } from "./course-studio";
import { isStudioMode } from "./studio-mode";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; mode?: string; build?: string }>;
}) {
  const { slug } = await params;
  const { lesson, mode, build } = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/maps/${slug}/studio`)}`);

  const [course, model] = await Promise.all([loadCourse({ slug }, session.user.id), userModelSummary(session.user.id)]);
  if (!course || !course.isCreator) notFound();

  return (
    <CourseStudio
      initial={course}
      initialFocus={lesson ?? null}
      initialMode={isStudioMode(mode) ? mode : null}
      autoBuild={build === "1" && course.lessons.length === 0}
      hasModel={Boolean(model) || env.AI_PROVIDER === "mock"}
    />
  );
}
