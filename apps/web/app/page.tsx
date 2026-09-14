import Link from "next/link";

import { getSession } from "@/lib/session";

import { LandingStartForm } from "./components/landing-start-form";
import { WaypathMark } from "./components/waypath-mark";
import { Constellation } from "./components/constellation";

export const dynamic = "force-dynamic";

/**
 * Landing page — implements prototype screen "01 Landing" (Aurora brand v2.0).
 */
export default async function Landing() {
  const session = await getSession();

  return (
    <main className="flex-1 bg-night-950 text-star-100">
      <nav className="flex items-center justify-between px-16 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <div className="flex items-center gap-8 text-sm text-star-400">
          <a className="hover:text-star-100" href="#how-it-works">
            How it works
          </a>
          <Link className="hover:text-star-100" href="/community">
            Community maps
          </Link>
          <a
            className="hover:text-star-100"
            href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
          >
            GitHub
          </a>
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-aurora-400 px-5 py-2.5 font-semibold text-ink-900"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full border border-night-800 px-5 py-2.5 text-star-100 hover:border-star-400"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      <section className="grid grid-cols-1 items-center gap-12 px-16 py-16 lg:grid-cols-2 lg:px-24">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            Learn anything.
            <br />
            See the whole map.
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-star-400">
            Type a topic. Watch a constellation of credited lessons appear, then travel it star by
            star.
          </p>
          <LandingStartForm />
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            {session
              ? "Community maps are public. Type a topic to build your own."
              : "Community maps are public. Sign in to build and save your own."}
          </p>
        </div>
        <Constellation className="hidden w-full lg:block" />
      </section>

      <section id="how-it-works" className="px-16 py-12 lg:px-24">
        <h2 className="text-3xl font-bold tracking-tight">Three moves, forever.</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-night-800 bg-night-900 p-8">
            <h3 className="text-xl font-semibold">Map it</h3>
            <p className="mt-3 leading-relaxed text-star-400">
              Your topic becomes a living knowledge graph in seconds. Prerequisites, paths, and
              progress, all visible at once.
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
              Unvisited / In progress / Mastered / Locked
            </p>
          </div>
          <div className="grid gap-5">
            <div className="rounded-2xl border border-night-800 bg-night-900 p-8">
              <h3 className="text-xl font-semibold">Travel it</h3>
              <p className="mt-3 leading-relaxed text-star-400">
                Lessons generate as you arrive: real videos, real articles, AI text with its
                sources named.
              </p>
            </div>
            <div className="rounded-2xl border border-night-800 bg-night-900 p-8">
              <h3 className="text-xl font-semibold">Connect</h3>
              <p className="mt-3 leading-relaxed text-star-400">
                Finish a map and request a 30-minute coffee chat with someone who has been where
                you are going.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="community" className="mt-12 bg-night-900 px-16 py-14 lg:px-24">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">Maps the community already walked.</h2>
            <p className="mt-4 leading-relaxed text-star-400">
              Browse published constellations without an account. MIT licensed. We will never
              compete on generation quality; we compete on community and credit.
            </p>
          </div>
          <Link
            href="/community"
            className="shrink-0 rounded-full bg-aurora-400 px-7 py-3.5 font-semibold text-ink-900"
          >
            Browse community maps
          </Link>
        </div>
      </section>

      <footer className="flex items-center justify-between px-16 py-8 lg:px-24">
        <div className="flex items-center gap-3">
          <WaypathMark className="h-5 w-5" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            EEF Learn by Emmanuel Eze Foundation
          </span>
        </div>
        <div className="flex gap-6 text-sm text-star-400">
          <Link className="hover:text-star-100" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-star-100" href="/age-policy">
            Age policy
          </Link>
          <a className="hover:text-star-100" href="https://emmanuelezefoundation.org">
            Contact
          </a>
        </div>
      </footer>
    </main>
  );
}
