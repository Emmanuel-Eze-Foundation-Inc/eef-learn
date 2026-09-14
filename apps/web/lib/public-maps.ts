import { prisma } from "@eef/db";

export type PublicMapNode = { id: string; slug: string; title: string; order: number };
export type PublicMapEdge = { fromId: string; toId: string };

export type PublicMap = {
  slug: string;
  title: string;
  topic: string;
  creatorName: string;
  nodes: PublicMapNode[];
  edges: PublicMapEdge[];
};

export async function getPublicMaps(take?: number): Promise<PublicMap[]> {
  const maps = await prisma.map.findMany({
    where: { visibility: "public", nodes: { some: {} } },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      creator: { select: { name: true } },
      nodes: {
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, order: true },
      },
      edges: { select: { fromId: true, toId: true } },
    },
  });

  return maps.map((map) => ({
    slug: map.slug,
    title: map.title,
    topic: map.topic,
    creatorName: map.creator.name || "an EEF learner",
    nodes: map.nodes,
    edges: map.edges,
  }));
}
