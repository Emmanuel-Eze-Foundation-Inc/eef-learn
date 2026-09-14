import { prisma } from "@eef/db";
import Link from "next/link";

import { getSession } from "@/lib/session";

import { WaypathMark } from "../components/waypath-mark";

export const dynamic = "force-dynamic";

/** Public catalog of published maps — the landing "Community maps" destination. */
export default async function CommunityPage() {
  const session = await getSession();
  const maps = await prisma.map.findMany({
    where: { visibility: "public", nodes: { some: {} } },
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { name: true } },
      _count: { select: { nodes: true } },
    },
  });

  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/community" className="text-star-100">
            Community maps
          </Link>
          {session ? (
            <Link href="/dashboard" className="text-star-400 hover:text-star-100">
              Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in?next=/community"
              className="rounded-full border border-night-800 px-5 py-2.5 text-star-100 hover:border-star-400"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      <header className="mt-12 max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">
          Community maps
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Learn from maps other people finished.</h1>
        <p className="mt-4 text-star-400">
          Every map here is published by a learner. Open one to see the constellation; sign in to
          travel it and save your stars.
        </p>
      </header>

      {maps.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-night-800 p-12 text-center">
          <p className="text-star-400">No published maps yet. Be the first to share one.</p>
          <Link
            href={session ? "/maps/new" : "/sign-up"}
            className="mt-6 inline-block rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
          >
            {session ? "Create a map" : "Start your first map"}
          </Link>
        </div>
      ) : (
        <ul className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <li key={map.id}>
              <Link
                href={session ? `/maps/${map.slug}` : `/share/${map.slug}`}
                className="block h-full rounded-2xl border border-night-800 bg-night-900 p-6 transition-colors hover:border-aurora-400"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
                  Community map
                </p>
                <h2 className="mt-3 text-lg font-semibold">{map.title}</h2>
                <p className="mt-2 text-sm text-star-400">
                  {map._count.nodes} star{map._count.nodes === 1 ? "" : "s"} · shared by{" "}
                  {map.creator.name || "an EEF learner"}
                </p>
                <p className="mt-6 text-sm font-semibold text-aurora-400">
                  {session ? "Travel this map →" : "Preview →"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
