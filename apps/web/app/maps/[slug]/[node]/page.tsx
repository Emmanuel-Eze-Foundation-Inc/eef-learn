import { prisma } from "@eef/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { WaypathMark } from "../../../components/waypath-mark";
import { SectionClient } from "./section-client";

export const dynamic = "force-dynamic";

/** Section view (ticket T10): content blocks + provenance + progress triggers. */
export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string; node: string }>;
}) {
  const { slug, node: nodeSlug } = await params;
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const map = await prisma.map.findUnique({
    where: { slug },
    include: { nodes: { orderBy: { order: "asc" } } },
  });
  if (!map) notFound();
  if (map.visibility !== "public" && map.creatorId !== session.user.id) notFound();

  const node = map.nodes.find((n) => n.slug === nodeSlug);
  if (!node) notFound();

  const blocks = await prisma.contentBlock.findMany({
    where: { nodeId: node.id, mapVersion: map.version },
    orderBy: { blockIndex: "asc" },
  });

  const idx = map.nodes.findIndex((n) => n.id === node.id);
  const nextNode = map.nodes[idx + 1] ?? null;
  const isCreator = map.creatorId === session.user.id;

  return (
    <main className="min-h-screen bg-night-950 text-star-100">
      <nav className="flex items-center justify-between px-8 py-6 lg:px-16">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <Link href={`/maps/${map.slug}`} className="text-sm text-star-400 hover:text-star-100">
          ← Back to map
        </Link>
      </nav>

      <article className="mx-auto max-w-3xl px-6 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">
          {map.title} · star {node.order + 1} of {map.nodes.length}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{node.title}</h1>

        {blocks.map((block) => (
          <section key={block.id} className="mt-10 rounded-2xl border border-night-800 bg-night-900 p-8">
            {block.title && <h2 className="text-2xl font-semibold">{block.title}</h2>}
            {block.body && (
              <div className="mt-4 space-y-4 leading-relaxed text-star-100/90">
                {block.body.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
            {block.url && (
              <a href={block.url} className="mt-4 block text-aurora-400 hover:underline">
                {block.url}
              </a>
            )}
            <footer className="mt-6 border-t border-night-800 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
              {block.type === "ai_text" ? (
                <>AI-generated · model {block.provenanceModel ?? "unknown"} · always verify important claims</>
              ) : (
                <>{block.type}</>
              )}
            </footer>
          </section>
        ))}

        <SectionClient
          nodeId={node.id}
          isCreator={isCreator}
          hasBlocks={blocks.length > 0}
          generationEnabled={map.generationEnabled}
          mapSlug={map.slug}
          nextNodeSlug={nextNode?.slug ?? null}
        />
      </article>
    </main>
  );
}
