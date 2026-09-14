import { prisma } from "@eef/db";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import type { GraphNode, NodeState } from "./map-graph";
import type { Stage } from "./travel-types";
import { TravelWorld } from "./travel-world";

export const dynamic = "force-dynamic";

/** Full-viewport travel world: the map is the page. */
export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ node?: string; star?: string; complete?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/maps/${slug}`)}`);

  const map = await prisma.map.findUnique({
    where: { slug },
    include: {
      nodes: {
        orderBy: { order: "asc" },
        include: { contentBlocks: { orderBy: { blockIndex: "asc" } } },
      },
      edges: true,
      progress: { where: { userId: session.user.id } },
    },
  });
  if (!map) notFound();
  if (map.visibility !== "public" && map.creatorId !== session.user.id) notFound();

  const progressByNode = new Map(map.progress.map((p) => [p.nodeId, p]));
  const masteredIds = new Set(map.progress.filter((p) => p.mastered).map((p) => p.nodeId));

  const stages: Stage[] = map.nodes.map((n) => {
    const prereqs = map.edges.filter((e) => e.toId === n.id).map((e) => e.fromId);
    const locked = prereqs.length > 0 && !prereqs.every((id) => masteredIds.has(id));
    let state: NodeState;
    if (masteredIds.has(n.id)) state = "mastered";
    else if (locked) state = "locked";
    else if (progressByNode.has(n.id)) state = "in_progress";
    else state = "available";
    const node: GraphNode = { id: n.id, slug: n.slug, title: n.title, order: n.order, state };
    const blocks = n.contentBlocks
      .filter((b) => b.mapVersion === map.version)
      .map((b) => ({
        id: b.id,
        title: b.title,
        body: b.body,
        url: b.url,
        type: b.type,
        provenanceModel: b.provenanceModel,
      }));
    return { ...node, blocks };
  });

  const wanted = query.node ?? query.star;
  const fromQuery = wanted ? stages.findIndex((s) => s.slug === wanted) : -1;
  const resume =
    stages.findIndex((s) => s.state === "in_progress") >= 0
      ? stages.findIndex((s) => s.state === "in_progress")
      : stages.findIndex((s) => s.state === "available");
  const initialIndex = fromQuery >= 0 ? fromQuery : Math.max(0, resume);

  const mapComplete = map.nodes.length > 0 && masteredIds.size === map.nodes.length;
  const [openChatRequest, thread] = await Promise.all([
    mapComplete
      ? prisma.coffeeChatRequest.findFirst({
          where: { userId: session.user.id, mapId: map.id, status: "open" },
        })
      : Promise.resolve(null),
    prisma.companionThread.findFirst({
      where: { userId: session.user.id, mapId: map.id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
    }),
  ]);

  const current = stages[initialIndex];
  const firstName = (session.user.name || "friend").split(" ")[0];
  const masteredCount = masteredIds.size;
  const greeting =
    masteredCount === 0
      ? `Hey ${firstName} — I'm here while you travel "${map.title}". Ask me anything about ${current?.title ?? "this map"}.`
      : `Welcome back, ${firstName}. ${masteredCount} star${masteredCount === 1 ? "" : "s"} down on "${map.title}" — you're at ${current?.title ?? "the map"}. What can I untangle for you?`;

  return (
    <TravelWorld
      mapId={map.id}
      mapSlug={map.slug}
      mapTitle={map.title}
      mapVersion={map.version}
      visibility={map.visibility}
      isCreator={map.creatorId === session.user.id}
      generationEnabled={map.generationEnabled}
      stages={stages}
      edges={map.edges.map((e) => ({ fromId: e.fromId, toId: e.toId }))}
      initialIndex={initialIndex}
      greeting={greeting}
      companionMessages={(thread?.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }))}
      alreadyRequestedChat={Boolean(openChatRequest)}
    />
  );
}
