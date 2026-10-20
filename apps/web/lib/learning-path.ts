import { prisma } from "@eef/db";

import type { Profile } from "./profile";

export type PathMap = {
  slug: string;
  title: string;
  creatorName: string;
  lessons: number;
  mastered: number;
  lastActive: string | null;
};

export type LearningPath = {
  profile: Profile;
  isPublic: boolean;
  learning: PathMap[];
  finished: PathMap[];
  published: { slug: string; title: string; topic: string; lessons: number }[];
};

/** A person's public learning path. Only public maps appear; private maps and requests never do. */
export async function loadLearningPath(userId: string): Promise<LearningPath | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true, headline: true, bio: true, location: true, website: true, learningPathPublic: true },
  });
  if (!user) return null;

  const [joined, published] = await Promise.all([
    prisma.map.findMany({
      where: { visibility: "public", creatorId: { not: userId }, progress: { some: { userId } } },
      include: {
        creator: { select: { name: true } },
        _count: { select: { nodes: true } },
        progress: { where: { userId }, orderBy: { updatedAt: "desc" }, select: { mastered: true, updatedAt: true } },
      },
    }),
    prisma.map.findMany({
      where: { visibility: "public", creatorId: userId, nodes: { some: {} } },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true, topic: true, _count: { select: { nodes: true } } },
    }),
  ]);

  const maps: PathMap[] = joined
    .map((map) => ({
      slug: map.slug,
      title: map.title,
      creatorName: map.creator.name || "an EEF learner",
      lessons: map._count.nodes,
      mastered: map.progress.filter((p) => p.mastered).length,
      lastActive: map.progress[0]?.updatedAt.toISOString() ?? null,
    }))
    .sort((a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));
  const isDone = (m: PathMap) => m.lessons > 0 && m.mastered >= m.lessons;

  return {
    profile: {
      name: user.name || "An EEF learner",
      image: user.image,
      headline: user.headline,
      bio: user.bio,
      location: user.location,
      website: user.website,
    },
    isPublic: user.learningPathPublic,
    learning: maps.filter((m) => !isDone(m)),
    finished: maps.filter(isDone),
    published: published.map((m) => ({ slug: m.slug, title: m.title, topic: m.topic, lessons: m._count.nodes })),
  };
}
