import { WaypathMark } from "./components/waypath-mark";
import { Constellation } from "./components/constellation";

/**
 * Landing page — implements prototype screen "01 Landing" (Aurora brand v2.0).
 * Static in M0; the topic input wires to anonymous skeleton preview in M3.
 */
export default function Landing() {
  return (
    <main className="flex-1 bg-night-950 text-star-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-16 py-6">
        <div className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </div>
        <div className="flex items-center gap-8 text-sm text-star-400">
          <a className="hover:text-star-100" href="#how-it-works">
            How it works
          </a>
          <a className="hover:text-star-100" href="#community">
            Community maps
          </a>
          <a
            className="hover:text-star-100"
            href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
          >
            GitHub
          </a>
          <a
            href="/sign-in"
            className="rounded-full border border-night-800 px-5 py-2.5 text-star-100 hover:border-star-400"
          >
            Sign in
          </a>
        </div>
      </nav>

      {/* Hero */}
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
          <form className="mt-9 flex items-center gap-2 rounded-2xl border border-night-800 bg-night-900 p-2">
            <input
              className="flex-1 bg-transparent px-4 py-3 text-star-100 outline-none placeholder:text-star-400"
              placeholder="What do you want to learn?"
              aria-label="What do you want to learn?"
            />
            <button
              type="submit"
              className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900"
            >
              Watch it build
            </button>
          </form>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            Free to try. No account needed. Every source credited.
          </p>
        </div>
        <Constellation className="hidden w-full lg:block" />
      </section>

      {/* How it works */}
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

      {/* Open source strip */}
      <section id="community" className="mt-12 bg-night-900 px-16 py-14 lg:px-24">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Built in the open by the Emmanuel Eze Foundation.
            </h2>
            <p className="mt-4 leading-relaxed text-star-400">
              MIT licensed. Self-host it with one command, or learn on ours. We will never compete
              on generation quality; we compete on community and credit.
            </p>
          </div>
          <a
            href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
            className="shrink-0 rounded-full border border-star-400 px-7 py-3.5 font-semibold hover:border-star-100"
          >
            Star on GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between px-16 py-8 lg:px-24">
        <div className="flex items-center gap-3">
          <WaypathMark className="h-5 w-5" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
            EEF Learn by Emmanuel Eze Foundation
          </span>
        </div>
        <div className="flex gap-6 text-sm text-star-400">
          <a className="hover:text-star-100" href="/privacy">
            Privacy
          </a>
          <a className="hover:text-star-100" href="/age-policy">
            Age policy
          </a>
          <a className="hover:text-star-100" href="https://emmanuelezefoundation.org">
            Contact
          </a>
        </div>
      </footer>
    </main>
  );
}
