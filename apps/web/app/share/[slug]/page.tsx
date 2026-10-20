import { prisma } from "@eef/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadCourse } from "@/lib/course";
import { buildOutline, lessonMinutes, sharedPrefixStripper } from "@/lib/course-model";
import { getSession } from "@/lib/session";

import { AccessGate } from "./access-gate";
import { SharePreview, type ShareLesson } from "./share-preview";

export const dynamic = "force-dynamic";

const SHARE_IMAGE = "/brand/learn-og-1200x630.png";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const map = await prisma.map.findUnique({
    where: { slug },
    select: { title: true, topic: true, visibility: true, creator: { select: { name: true } }, _count: { select: { nodes: true } } },
  });
  if (!map) return { title: "Not found · EEF Learn" };
  const description = `A ${map._count.nodes}-lesson learning map on ${map.topic} by ${map.creator.name || "an EEF learner"}. Preview it free on EEF Learn.`;
  return {
    title: `${map.title} · EEF Learn`,
    description,
    openGraph: { title: map.title, description, images: [{ url: SHARE_IMAGE, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: map.title, description, images: [SHARE_IMAGE] },
    robots: map.visibility === "public" ? undefined : { index: false },
  };
}

/** Public share: the whole course as a map. Pick a lesson, then enter there. */
export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  const viewerId = session?.user.id ?? "";
  const [course, map] = await Promise.all([
    loadCourse({ slug }, viewerId),
    prisma.map.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        topic: true,
        creator: { select: { name: true } },
        _count: { select: { nodes: true } },
        access: { where: { userId: viewerId }, select: { status: true } },
      },
    }),
  ]);
  if (!map) notFound();
  if (!course) {
    return (
      <AccessGate
        mapId={map.id}
        title={map.title}
        topic={map.topic}
        publisher={map.creator.name || "an EEF learner"}
        lessons={map._count.nodes}
        signedIn={Boolean(session)}
        status={map.access[0]?.status ?? null}
      />
    );
  }
  if (course.lessons.length === 0) notFound();

  const outline = buildOutline(course.lessons);
  const moduleIndex = new Map(outline.modules.map((m, i) => [m.head.id, i]));
  const label = sharedPrefixStripper(course.lessons.map((l) => l.title));
  const titleById = new Map(course.lessons.map((l) => [l.id, label(l.title)]));

  const lessons: ShareLesson[] = course.lessons.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: label(l.title),
    parentId: l.parentId,
    x: l.positionX,
    y: l.positionY,
    role: l.id === outline.intro?.id ? "intro" : moduleIndex.has(l.id) ? "module" : "lesson",
    moduleIndex: moduleIndex.get(l.id) ?? null,
    minutes: l.blocks.length ? lessonMinutes(l) : 0,
    blocks: l.blocks.map((b) => ({ id: b.id, type: b.type, title: b.title })),
    buildsOn: l.prereqIds.flatMap((id) => titleById.get(id) ?? []),
  }));

  return (
    <SharePreview
      slug={course.slug}
      title={course.title}
      topic={course.topic}
      publisher={map.creator.name || "an EEF learner"}
      signedIn={Boolean(session)}
      lessons={lessons}
      prerequisites={course.prerequisites}
      modules={outline.modules.map((m) => ({ id: m.head.id, lessonIds: m.lessons.map((l) => l.id) }))}
      introId={outline.intro?.id ?? null}
    />
  );
}
