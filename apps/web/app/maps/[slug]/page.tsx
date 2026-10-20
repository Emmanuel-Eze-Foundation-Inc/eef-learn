import { prisma } from "@eef/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { loadCourse } from "@/lib/course";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { tutorGreeting } from "@/lib/tutor";
import { userModelSummary } from "@/lib/user-ai-key";

import { CoursePlayer } from "./player/course-player";

export const dynamic = "force-dynamic";

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ node?: string; star?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/maps/${slug}`)}`);

  const course = await loadCourse({ slug }, session.user.id);
  if (!course) {
    const exists = await prisma.map.findUnique({ where: { slug }, select: { id: true } });
    if (exists) redirect(`/share/${slug}`);
    notFound();
  }

  if (course.lessons.length === 0) {
    return (
      <main className="grid min-h-svh place-items-center bg-night-950 px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">{course.title} has no lessons yet.</h1>
          {course.isCreator ? (
            <Button asChild className="mt-6">
              <Link href={`/maps/${slug}/studio`}>Build it with the course agent</Link>
            </Button>
          ) : null}
        </div>
      </main>
    );
  }

  const wanted = query.node ?? query.star;
  const fromQuery = wanted ? course.lessons.find((l) => l.slug === wanted) : undefined;
  const resume =
    course.lessons.find((l) => l.state === "in_progress") ??
    course.lessons.find((l) => l.state === "available") ??
    course.lessons[0]!;
  const current = fromQuery ?? resume;

  const [thread, model] = await Promise.all([
    prisma.companionThread.findFirst({
      where: { userId: session.user.id, mapId: course.mapId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
    }),
    userModelSummary(session.user.id),
  ]);

  const firstName = (session.user.name || "friend").split(" ")[0];
  const done = course.lessons.filter((l) => l.state === "mastered").length;
  const greeting = tutorGreeting({ firstName, courseTitle: course.title, done, total: course.lessons.length });

  return (
    <CoursePlayer
      course={course}
      initialLessonId={current.id}
      greeting={greeting}
      tutorReady={Boolean(model) || env.AI_PROVIDER === "mock"}
      tutorMessages={(thread?.messages ?? []).map((m) => ({ role: m.role, content: m.content }))}
    />
  );
}
