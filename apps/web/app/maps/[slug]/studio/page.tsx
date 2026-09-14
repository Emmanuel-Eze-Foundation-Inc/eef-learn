import { flattenTree } from "@eef/core";
import { prisma } from "@eef/db";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { MapStudio } from "./map-studio";

export const dynamic = "force-dynamic";

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/maps/${slug}/studio`)}`);

  const map = await prisma.map.findUnique({
    where: { slug },
    include: {
      nodes: {
        include: { contentBlocks: { orderBy: { blockIndex: "asc" } } },
      },
      edges: true,
    },
  });
  if (!map) notFound();
  if (map.creatorId !== session.user.id) notFound();

  const nodes = flattenTree(map.nodes.map((n) => ({ ...n, parentId: n.parentId }))).map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    order: n.order,
    parentId: n.parentId,
    blocks: n.contentBlocks
      .filter((b) => b.mapVersion === map.version)
      .map((b) => ({
        id: b.id,
        type: b.type,
        title: b.title,
        body: b.body,
        url: b.url,
        blockIndex: b.blockIndex,
      })),
  }));

  return (
    <MapStudio
      initial={{
        mapId: map.id,
        slug: map.slug,
        title: map.title,
        topic: map.topic,
        visibility: map.visibility,
        nodes,
        edges: map.edges
          .filter((e) => e.kind === "prerequisite")
          .map((e) => ({ fromId: e.fromId, toId: e.toId })),
      }}
    />
  );
}
