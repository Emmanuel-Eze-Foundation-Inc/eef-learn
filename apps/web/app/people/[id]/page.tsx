import { EyeOff, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LearnNav } from "@/components/chrome/learn-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadLearningPath, type PathMap } from "@/lib/learning-path";
import { getSession } from "@/lib/session";

import { UnseenEngineSponsor } from "../../components/unseen-engine-sponsor";
import { ago, initials, plural } from "../../dashboard/format";

export const dynamic = "force-dynamic";

function MapLine({ map, done }: { map: PathMap; done?: boolean }) {
  const pct = map.lessons ? Math.round((map.mastered / map.lessons) * 100) : 0;
  return (
    <li className="rounded-2xl border border-night-800 bg-night-900/40 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <Link href={`/share/${map.slug}`} className="min-w-0 truncate font-semibold hover:text-aurora-400">
          {map.title}
        </Link>
        <span className="shrink-0 text-sm text-star-400 tabular-nums">
          {done ? plural(map.lessons, "lesson") : `${map.mastered} of ${map.lessons}`}
        </span>
      </div>
      <p className="mt-1 text-sm text-star-400">
        by {map.creatorName}
        {map.lastActive ? ` · ${done ? "finished" : "active"} ${ago(map.lastActive)}` : ""}
      </p>
      {done ? null : <Progress value={pct} className="mt-3 h-1.5" aria-label={`${pct}% of ${map.title}`} />}
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Someone's public learning path: the public maps they're on and what they've finished. */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const path = await loadLearningPath(id);
  const isSelf = session?.user.id === id;
  if (!path || (!path.isPublic && !isSelf)) notFound();

  const { profile } = path;
  const empty = !path.learning.length && !path.finished.length && !path.published.length;

  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <LearnNav signedIn={Boolean(session)} />
      <div className="mx-auto w-full max-w-[760px] flex-1 px-5 pt-10 pb-20">
        {isSelf ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-night-800 bg-night-900/60 px-4 py-3 text-sm">
            <p className="flex items-center gap-2 text-star-400">
              {path.isPublic ? (
                "This is what everyone sees at this link."
              ) : (
                <>
                  <EyeOff className="size-4" aria-hidden /> Only you can see this. Your learning path is private.
                </>
              )}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard?tab=settings">{path.isPublic ? "Settings" : "Make it public"}</Link>
            </Button>
          </div>
        ) : null}

        <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar className="size-20 shrink-0 border border-night-800">
            {profile.image ? <AvatarImage src={profile.image} alt="" /> : null}
            <AvatarFallback className="bg-night-900 text-xl font-semibold">{initials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{profile.name}</h1>
            {profile.headline ? <p className="mt-1 text-lg text-star-100/90">{profile.headline}</p> : null}
            {profile.location || profile.website ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-star-400">
                {profile.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden /> {profile.location}
                  </span>
                ) : null}
                {profile.website ? (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="inline-flex min-w-0 items-center gap-1.5 hover:text-aurora-400"
                  >
                    <Globe className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  </a>
                ) : null}
              </p>
            ) : null}
            {profile.bio ? <p className="mt-4 max-w-[60ch] leading-relaxed whitespace-pre-line text-star-100/85">{profile.bio}</p> : null}
          </div>
        </header>

        <h2 className="mt-10 text-sm font-medium text-star-400">Learning path</h2>
        <p className="mt-1 text-star-100">
          {[
            path.learning.length ? `${plural(path.learning.length, "map")} in progress` : null,
            path.finished.length ? `${path.finished.length} finished` : null,
            path.published.length ? `${path.published.length} published` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Just getting started."}
        </p>

        {empty ? (
          <p className="mt-10 rounded-2xl border border-dashed border-night-800 p-8 text-center text-sm text-star-400">
            No public maps yet. <Link href="/community" className="text-aurora-400 hover:underline">Browse community maps</Link>
          </p>
        ) : null}

        {path.learning.length ? (
          <Section title="Learning now">
            <ul className="mt-3 flex flex-col gap-2">
              {path.learning.map((m) => (
                <MapLine key={m.slug} map={m} />
              ))}
            </ul>
          </Section>
        ) : null}

        {path.finished.length ? (
          <Section title="Finished">
            <ul className="mt-3 flex flex-col gap-2">
              {path.finished.map((m) => (
                <MapLine key={m.slug} map={m} done />
              ))}
            </ul>
          </Section>
        ) : null}

        {path.published.length ? (
          <Section title="Maps they made">
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {path.published.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/share/${m.slug}`}
                    className="block h-full rounded-2xl border border-night-800 bg-night-900/40 p-4 transition-colors duration-200 hover:border-aurora-400/50"
                  >
                    <p className="font-semibold">{m.title}</p>
                    <p className="mt-1 text-sm text-star-400">{plural(m.lessons, "lesson")}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
      <footer className="border-t border-night-800 px-5 py-8 lg:px-12">
        <UnseenEngineSponsor variant="footer" />
      </footer>
    </main>
  );
}
