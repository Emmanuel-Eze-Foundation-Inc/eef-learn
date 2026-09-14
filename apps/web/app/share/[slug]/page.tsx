import { flattenTree } from "@eef/core";
import { prisma } from "@eef/db";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/session";

import { SharePreview, type PreviewNode } from "./share-preview";

export const dynamic = "force-dynamic";

/** Public share: the travel order is the map. Click a stop, then enter. */
export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const map = await prisma.map.findUnique({
    where: { slug },
    include: {
      nodes: {
        orderBy: { order: "asc" },
        include: { contentBlocks: { orderBy: { blockIndex: "asc" }, take: 1 } },
      },
      edges: true,
      creator: { select: { name: true } },
    },
  });
  if (!map || map.visibility !== "public") notFound();
  const session = await getSession();

  const travel = flattenTree(map.nodes.map((n) => ({ ...n, parentId: n.parentId })));
  const titleById = new Map(map.nodes.map((n) => [n.id, n.title]));
  const prereqsByTo = new Map<string, string[]>();
  for (const edge of map.edges) {
    if (edge.kind !== "prerequisite") continue;
    const fromTitle = titleById.get(edge.fromId);
    if (!fromTitle) continue;
    const list = prereqsByTo.get(edge.toId) ?? [];
    list.push(fromTitle);
    prereqsByTo.set(edge.toId, list);
  }

  const nodes: PreviewNode[] = travel.map((n) => {
    const lead = n.contentBlocks.find((b) => b.mapVersion === map.version) ?? n.contentBlocks[0];
    return {
      id: n.id,
      slug: n.slug,
      title: n.title,
      parentId: n.parentId,
      blockType: lead?.type ?? null,
      blockTitle: lead?.title ?? null,
      prereqTitles: prereqsByTo.get(n.id) ?? [],
    };
  });

  return (
    <SharePreview
      slug={map.slug}
      title={map.title}
      topic={map.topic}
      publisher={map.creator.name || "an EEF learner"}
      lessonCount={nodes.length}
      signedIn={Boolean(session)}
      nodes={nodes}
    />
  );
}
