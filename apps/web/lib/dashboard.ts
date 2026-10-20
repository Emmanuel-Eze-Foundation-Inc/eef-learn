import { prisma } from "@eef/db";

import type { Profile } from "./profile";
import type { AiProvider } from "./ai-providers";
import { MCP_RESOURCE, mcpEnabled } from "./auth";
import { userModelSummary } from "./user-ai-key";

export type LearningMap = {
  id: string;
  slug: string;
  title: string;
  creatorName: string;
  lessons: number;
  mastered: number;
  /** where to resume, when they've started */
  resumeSlug: string | null;
  lastActive: string | null;
  access: "open" | "approved" | "pending" | "declined" | "revoked";
};

export type CreatedMap = {
  id: string;
  slug: string;
  title: string;
  topic: string;
  visibility: "private" | "unlisted" | "public";
  lessons: number;
  learners: number;
  pending: number;
  mastered: number;
  updatedAt: string;
};

export type AccessPerson = {
  mapId: string;
  mapTitle: string;
  userId: string;
  name: string;
  email: string;
  message: string | null;
  status: "pending" | "approved" | "declined";
  at: string;
};

export type DashboardData = {
  user: Profile & {
    id: string;
    email: string;
    emailVerified: boolean;
    learningPathPublic: boolean;
    isAdmin: boolean;
  };
  resume: { mapSlug: string; mapTitle: string; lessonSlug: string; lessonTitle: string; mastered: boolean } | null;
  learning: LearningMap[];
  created: CreatedMap[];
  requests: AccessPerson[];
  people: AccessPerson[];
  /** the model the user brought; null means AI features ask them to connect one */
  ai: { provider: AiProvider; model: string | null } | null;
  /** AI apps the user approved over MCP */
  aiApps: { clientId: string; name: string; connectedAt: string }[];
  /** null when this instance isn't on https, so MCP clients can't sign in */
  mcpUrl: string | null;
};

export async function loadDashboard(userId: string): Promise<DashboardData | null> {
  const [user, joined, mine, accessRows, ai, consents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        headline: true,
        bio: true,
        location: true,
        website: true,
        learningPathPublic: true,
        role: true,
      },
    }),
    prisma.map.findMany({
      where: {
        creatorId: { not: userId },
        OR: [{ progress: { some: { userId } } }, { access: { some: { userId } } }],
      },
      include: {
        creator: { select: { name: true } },
        _count: { select: { nodes: true } },
        progress: {
          where: { userId },
          orderBy: { updatedAt: "desc" },
          select: { mastered: true, updatedAt: true, node: { select: { slug: true } } },
        },
        access: { where: { userId }, select: { status: true } },
      },
    }),
    prisma.map.findMany({
      where: { creatorId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { nodes: true } },
        progress: { select: { userId: true, mastered: true } },
        access: { where: { status: "pending" }, select: { id: true } },
      },
    }),
    prisma.mapAccess.findMany({
      where: { map: { creatorId: userId } },
      orderBy: { updatedAt: "desc" },
      include: {
        map: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    userModelSummary(userId),
    prisma.oauthConsent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { clientId: true, createdAt: true, client: { select: { name: true, uri: true } } },
    }),
  ]);
  if (!user) return null;

  const learning: LearningMap[] = joined
    .map((map) => {
      const status = map.access[0]?.status;
      const access: LearningMap["access"] =
        map.visibility === "public"
          ? "open"
          : status === "approved"
            ? "approved"
            : status === "pending"
              ? "pending"
              : status === "declined"
                ? "declined"
                : "revoked";
      const latest = map.progress[0];
      return {
        id: map.id,
        slug: map.slug,
        title: map.title,
        creatorName: map.creator.name || "an EEF learner",
        lessons: map._count.nodes,
        mastered: map.progress.filter((p) => p.mastered).length,
        resumeSlug: latest?.node.slug ?? null,
        lastActive: latest?.updatedAt.toISOString() ?? null,
        access,
      };
    })
    .sort((a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));

  const created: CreatedMap[] = mine.map((map) => ({
    id: map.id,
    slug: map.slug,
    title: map.title,
    topic: map.topic,
    visibility: map.visibility,
    lessons: map._count.nodes,
    learners: new Set(map.progress.filter((p) => p.userId !== userId).map((p) => p.userId)).size,
    pending: map.access.length,
    mastered: map.progress.filter((p) => p.userId === userId && p.mastered).length,
    updatedAt: map.updatedAt.toISOString(),
  }));

  const people: AccessPerson[] = accessRows.map((row) => ({
    mapId: row.map.id,
    mapTitle: row.map.title,
    userId: row.user.id,
    name: row.user.name || row.user.email.split("@")[0]!,
    email: row.user.email,
    message: row.message,
    status: row.status,
    at: row.updatedAt.toISOString(),
  }));

  const travelable = new Set([
    ...created.map((m) => m.id),
    ...learning.filter((m) => m.access === "open" || m.access === "approved").map((m) => m.id),
  ]);
  const last = await prisma.progress.findFirst({
    where: { userId, mapId: { in: [...travelable] } },
    orderBy: { updatedAt: "desc" },
    include: { map: { select: { slug: true, title: true } }, node: { select: { slug: true, title: true } } },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      headline: user.headline,
      bio: user.bio,
      location: user.location,
      website: user.website,
      learningPathPublic: user.learningPathPublic,
      isAdmin: user.role === "admin",
    },
    resume: last
      ? {
          mapSlug: last.map.slug,
          mapTitle: last.map.title,
          lessonSlug: last.node.slug,
          lessonTitle: last.node.title,
          mastered: last.mastered,
        }
      : null,
    learning,
    created,
    requests: people.filter((p) => p.status === "pending"),
    people: people.filter((p) => p.status === "approved"),
    ai,
    aiApps: [...new Map(consents.map((c) => [c.clientId, c])).values()].map((c) => ({
      clientId: c.clientId,
      name: c.client.name || appHost(c.client.uri ?? c.clientId),
      connectedAt: (c.createdAt ?? new Date()).toISOString(),
    })),
    mcpUrl: mcpEnabled ? MCP_RESOURCE : null,
  };
}

function appHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "An AI app";
  }
}
