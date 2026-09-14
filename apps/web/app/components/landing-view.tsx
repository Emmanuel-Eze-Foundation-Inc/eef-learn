"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import type { PublicMap } from "@/lib/public-maps";

import { AuroraWakes } from "./aurora-wakes";
import { useAuthDialog } from "./auth-dialog";
import { HowPath } from "./how-path";
import { LearnLockup } from "./learn-lockup";
import { MapSkyCard } from "./map-sky-card";
import { UnseenEngineSponsor } from "./unseen-engine-sponsor";
import { WakeAtlasSky } from "./wake-atlas-sky";

export function LandingView({
  signedIn,
  maps,
}: {
  signedIn: boolean;
  maps: PublicMap[];
}) {
  const dialog = useAuthDialog();
  const router = useRouter();

  function onBuild(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const topic = String(new FormData(e.currentTarget).get("topic") ?? "").trim();
    if (topic.length < 2) return;
    if (signedIn) {
      router.push(`/maps/new?topic=${encodeURIComponent(topic)}`);
      return;
    }
    dialog.open({ topic, intent: "signup" });
  }

  return (
    <main className="flex-1 bg-night-950 text-star-100">
      <nav className="sticky top-0 z-20 flex items-center justify-between bg-night-950/20 px-5 py-4 backdrop-blur-[2px] lg:px-12">
        <Link href="/learn" className="flex items-center">
          <LearnLockup />
        </Link>
        <div className="flex items-center gap-5 text-sm text-star-400">
          <a className="hidden hover:text-star-100 sm:inline" href="#how">
            How it works
          </a>
          <a className="hover:text-star-100" href="#community">
            Community maps
          </a>
          <a
            className="hidden hover:text-star-100 md:inline"
            href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
          >
            GitHub
          </a>
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-aurora-400 px-5 py-2.5 font-semibold text-ink-900"
            >
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => dialog.open({ intent: "signin" })}
              className="rounded-full border border-star-100/20 px-5 py-2.5 text-star-100 hover:border-star-400"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <section className="relative min-h-[calc(100dvh-4.5rem)] overflow-hidden">
        <img
          src="/landing/wake-atlas.png"
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <AuroraWakes />
        <WakeAtlasSky maps={maps} />
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-[1400px] flex-col justify-center px-5 py-16 lg:px-12">
          <div className="pointer-events-auto max-w-xl">
            <h1 className="max-w-[14ch] text-5xl font-light leading-[1.05] tracking-tight md:text-6xl">
              Learn anything. See the whole map.
            </h1>
            <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-star-400">
              Type a topic. A constellation of credited lessons appears. Travel it star by star.
            </p>
            <form
              onSubmit={onBuild}
              className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-star-100/10 bg-night-950/70 p-2 sm:flex-row sm:items-center"
            >
              <input
                name="topic"
                required
                minLength={2}
                maxLength={200}
                className="flex-1 bg-transparent px-4 py-3 text-star-100 outline-none placeholder:text-star-400"
                placeholder="What do you want to learn?"
                aria-label="What do you want to learn?"
              />
              <button
                type="submit"
                className="rounded-xl bg-aurora-400 px-6 py-3 font-semibold text-ink-900 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]"
              >
                Watch it build
              </button>
            </form>
            <div className="mt-4">
              <Link
                href="/community"
                className="inline-flex rounded-full border border-star-100/20 px-6 py-3 text-sm font-semibold text-star-100 hover:border-star-400"
              >
                View community maps
              </Link>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
              {signedIn
                ? "Building a map uses your OpenRouter key. Community maps are public to preview."
                : "Building a map needs an account. Preview community maps freely, then enter to travel."}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-5 pb-24 lg:px-12">
        <HowPath />

        <section id="community" className="scroll-mt-24 py-24">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Maps the community already walked.
          </h2>
          <p className="mt-5 max-w-[58ch] leading-relaxed text-star-400">
            Preview any constellation without an account. Entering one to travel asks you to sign in
            or create an account in the same popup.
          </p>
          {maps.length === 0 ? (
            <p className="mt-10 rounded-[1.75rem] border border-dashed border-night-800 p-10 text-star-400">
              No published maps yet. Be the first to share one after you build.
            </p>
          ) : (
            <ul className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
              {maps.map((map) => (
                <li key={map.slug}>
                  <MapSkyCard map={map} signedIn={signedIn} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/community"
            className="mt-10 inline-flex text-sm font-semibold text-aurora-400 hover:underline"
          >
            Browse the full atlas
          </Link>
        </section>

        <section className="py-24">
          <UnseenEngineSponsor variant="billboard" />
        </section>

        <section className="py-24">
          <h2 className="text-3xl font-bold tracking-tight">Open sky. MIT licensed.</h2>
          <p className="mt-5 max-w-[58ch] leading-relaxed text-star-400">
            EEF Learn is a public good from the Emmanuel Eze Foundation. Self-host it. Fork it. We
            will not compete on generation quality. We compete on community and credit.
          </p>
          <a
            href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
            className="mt-8 inline-flex rounded-full border border-night-800 px-6 py-3 font-semibold hover:border-star-400"
          >
            View the repo
          </a>
        </section>

        <section className="pb-8 pt-12">
          <h2 className="text-3xl font-bold tracking-tight">Your next star is a topic away.</h2>
          <form
            onSubmit={onBuild}
            className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-night-800 bg-night-900 p-2 sm:flex-row sm:items-center"
          >
            <input
              name="topic"
              required
              minLength={2}
              maxLength={200}
              className="flex-1 bg-transparent px-4 py-3 outline-none placeholder:text-star-400"
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
        </section>
      </div>

      <footer className="flex flex-col gap-6 border-t border-night-800 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex items-center gap-3">
          <LearnLockup variant="foundation" />
        </div>
        <UnseenEngineSponsor variant="footer" />
        <div className="flex gap-6 text-sm text-star-400">
          <Link className="hover:text-star-100" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-star-100" href="/age-policy">
            Age policy
          </Link>
          <Link className="hover:text-star-100" href="/">
            Foundation
          </Link>
          <Link className="hover:text-star-100" href="/contact">
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
