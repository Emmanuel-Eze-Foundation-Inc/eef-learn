import { DEFAULT_QUOTAS, type QuotaKind } from "@eef/core";
import { prisma } from "@eef/db";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { WaypathMark } from "../components/waypath-mark";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

/** Dashboard — prototype screen "02 Dashboard": resume card, my maps, quotas. */
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const userId = session.user.id;

  const [maps, lastProgress, quotas] = await Promise.all([
    prisma.map.findMany({
      where: { creatorId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { nodes: true } },
        progress: { where: { userId }, select: { mastered: true } },
      },
    }),
    prisma.progress.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { map: true, node: true },
    }),
    prisma.quota.findMany({ where: { userId } }),
  ]);

  const quotaFor = (kind: QuotaKind) => {
    const row = quotas.find((q) => q.kind === kind);
    return { used: row?.used ?? 0, limit: row?.limit ?? DEFAULT_QUOTAS[kind] };
  };
  const mapsQuota = quotaFor("maps_per_day");

  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            {session.user.name}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <header className="mt-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {lastProgress ? "Pick up where you left off." : "Where do you want to go?"}
          </h1>
          <p className="mt-3 text-star-400">
            {maps.length === 0
              ? "Your first map is one topic away."
              : `${maps.length} map${maps.length === 1 ? "" : "s"} in your sky.`}
          </p>
        </div>
        <Link
          href="/maps/new"
          className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
        >
          New map
        </Link>
      </header>

      {/* Resume card */}
      {lastProgress && (
        <Link
          href={`/maps/${lastProgress.map.slug}?node=${lastProgress.node.slug}`}
          className="mt-10 block rounded-2xl border border-night-800 bg-night-900 p-8 transition-colors hover:border-aurora-400"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">
            Continue traveling
          </p>
          <h2 className="mt-3 text-2xl font-semibold">{lastProgress.map.title}</h2>
          <p className="mt-2 text-star-400">
            You are at <span className="text-gold-400">{lastProgress.node.title}</span>
            {lastProgress.mastered ? " — mastered. The next star is waiting." : "."}
          </p>
        </Link>
      )}

      {/* My maps */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My maps</h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            {mapsQuota.used}/{mapsQuota.limit} new maps today
          </span>
        </div>
        {maps.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-night-800 p-12 text-center">
            <p className="text-star-400">
              No maps yet. Type a topic and watch a constellation appear.
            </p>
            <Link
              href="/maps/new"
              className="mt-6 inline-block rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
            >
              Create your first map
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {maps.map((map) => {
              const mastered = map.progress.filter((p) => p.mastered).length;
              return (
                <Link
                  key={map.id}
                  href={`/maps/${map.slug}`}
                  className="rounded-2xl border border-night-800 bg-night-900 p-6 transition-colors hover:border-aurora-400"
                >
                  <h3 className="text-lg font-semibold">{map.title}</h3>
                  <p className="mt-2 text-sm text-star-400">
                    {mastered}/{map._count.nodes} stars mastered
                  </p>
                  <div
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-night-800"
                    role="progressbar"
                    aria-valuenow={mastered}
                    aria-valuemin={0}
                    aria-valuemax={map._count.nodes}
                    aria-label={`${map.title} progress`}
                  >
                    <div
                      className="h-full rounded-full bg-gold-400"
                      style={{
                        width: `${map._count.nodes === 0 ? 0 : Math.round((mastered / map._count.nodes) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
                    {map.visibility === "public" ? "Published" : "Private"} · v{map.version}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
