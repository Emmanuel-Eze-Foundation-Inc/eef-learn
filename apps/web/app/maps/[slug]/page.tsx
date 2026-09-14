import { prisma } from "@eef/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { WaypathMark } from "../../components/waypath-mark";
import { CoffeeChatCard } from "./coffee-chat-card";
import { MapGraph, type GraphNode, type NodeState } from "./map-graph";
import { MapViewSwitcher } from "./map-view-switcher";
import { PublishButton } from "./publish-button";

export const dynamic = "force-dynamic";

/** Map view (ticket T8): the 2D constellation — first-class, not a fallback. */
export default async function MapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/maps/${slug}`)}`);

  const map = await prisma.map.findUnique({
    where: { slug },
    include: {
      nodes: { orderBy: { order: "asc" } },
      edges: true,
      progress: { where: { userId: session.user.id } },
    },
  });
  if (!map) notFound();
  if (map.visibility !== "public" && map.creatorId !== session.user.id) notFound();

  const progressByNode = new Map(map.progress.map((p) => [p.nodeId, p]));
  const masteredIds = new Set(map.progress.filter((p) => p.mastered).map((p) => p.nodeId));

  const nodes: GraphNode[] = map.nodes.map((n) => {
    const prereqs = map.edges.filter((e) => e.toId === n.id).map((e) => e.fromId);
    const locked = prereqs.length > 0 && !prereqs.every((id) => masteredIds.has(id));
    let state: NodeState;
    if (masteredIds.has(n.id)) state = "mastered";
    else if (locked) state = "locked";
    else if (progressByNode.has(n.id)) state = "in_progress";
    else state = "available";
    return { id: n.id, slug: n.slug, title: n.title, order: n.order, state };
  });

  const masteredCount = masteredIds.size;
  const next = nodes.find((n) => n.state === "in_progress") ?? nodes.find((n) => n.state === "available");

  const mapComplete = map.nodes.length > 0 && masteredCount === map.nodes.length;
  const openChatRequest = mapComplete
    ? await prisma.coffeeChatRequest.findFirst({
        where: { userId: session.user.id, mapId: map.id, status: "open" },
      })
    : null;

  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-star-400 hover:text-star-100">
          Back to dashboard
        </Link>
      </nav>

      <header className="mt-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            Learning map · v{map.version}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">{map.title}</h1>
          <p className="mt-3 text-star-400">
            {masteredCount}/{map.nodes.length} stars mastered
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {map.creatorId === session.user.id && (
            <PublishButton mapId={map.id} slug={map.slug} visibility={map.visibility} />
          )}
          {next && (
            <Link
              href={`/maps/${map.slug}/${next.slug}`}
              className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
            >
              {masteredCount === 0 ? "Start traveling" : "Continue"} → {next.title}
            </Link>
          )}
        </div>
      </header>

      {mapComplete && (
        <CoffeeChatCard
          mapId={map.id}
          mapTitle={map.title}
          alreadyRequested={Boolean(openChatRequest)}
        />
      )}

      <section className="mt-8">
        <MapViewSwitcher
          mapSlug={map.slug}
          nodes={nodes}
          edges={map.edges.map((e) => ({ fromId: e.fromId, toId: e.toId }))}
          map2d={
            <MapGraph
              mapSlug={map.slug}
              nodes={nodes}
              edges={map.edges.map((e) => ({ fromId: e.fromId, toId: e.toId }))}
            />
          }
        />
        <div className="mt-4 flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-gold-400" />Mastered</span>
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full border-2 border-aurora-400" />In progress</span>
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full border-2 border-star-400" />Ready</span>
          <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full border-2 border-night-800" />Locked</span>
        </div>
      </section>

      {/* Accessible list alternative to the SVG */}
      <section className="mt-10" aria-label="Map nodes as a list">
        <h2 className="text-lg font-semibold">Travel order</h2>
        <ol className="mt-4 space-y-2">
          {nodes.map((n) => (
            <li key={n.id} className="flex items-center gap-3">
              <span className="w-6 text-right font-mono text-xs text-star-400">{n.order + 1}.</span>
              {n.state === "locked" ? (
                <span className="text-star-400">{n.title} (locked — master its prerequisites first)</span>
              ) : (
                <Link href={`/maps/${map.slug}/${n.slug}`} className="hover:text-aurora-400">
                  {n.title}
                  {n.state === "mastered" && <span className="ml-2 text-gold-400">★</span>}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
