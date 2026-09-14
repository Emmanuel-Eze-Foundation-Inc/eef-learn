import { prisma } from "@eef/db";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WaypathMark } from "../../components/waypath-mark";
import { MapGraph, type GraphNode } from "../../maps/[slug]/map-graph";

export const dynamic = "force-dynamic";

/** Public share page (ticket T11): read-only map, no account required. */
export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const map = await prisma.map.findUnique({
    where: { slug },
    include: {
      nodes: { orderBy: { order: "asc" } },
      edges: true,
      creator: { select: { name: true } },
    },
  });
  if (!map || map.visibility !== "public") notFound();

  const nodes: GraphNode[] = map.nodes.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    order: n.order,
    state: "available",
  }));

  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/community" className="text-sm text-star-400 hover:text-star-100">
            Community maps
          </Link>
          <Link
            href={`/maps/${map.slug}`}
            className="rounded-full bg-aurora-400 px-5 py-2.5 text-sm font-semibold text-ink-900"
          >
            Travel this map
          </Link>
        </div>
      </nav>

      <header className="mt-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
          Community map · shared by {map.creator.name || "an EEF learner"}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{map.title}</h1>
        <p className="mt-3 max-w-xl text-star-400">
          {map.nodes.length} stars from “{map.topic}”. Sign in to travel it, save your progress,
          and see every source credited along the way.
        </p>
      </header>

      <section className="mt-8">
        <MapGraph
          mapSlug={map.slug}
          nodes={nodes}
          edges={map.edges.map((e) => ({ fromId: e.fromId, toId: e.toId }))}
        />
      </section>

      <section className="mt-10" aria-label="Map nodes as a list">
        <h2 className="text-lg font-semibold">Travel order</h2>
        <ol className="mt-4 space-y-2">
          {map.nodes.map((n) => (
            <li key={n.id} className="flex items-center gap-3">
              <span className="w-6 text-right font-mono text-xs text-star-400">{n.order + 1}.</span>
              <span>{n.title}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-16 border-t border-night-800 py-8 text-sm text-star-400">
        Built in the open by the{" "}
        <a href="https://emmanuelezefoundation.org" className="text-aurora-400 hover:underline">
          Emmanuel Eze Foundation
        </a>
        . Every lesson credits its sources.
      </footer>
    </main>
  );
}
