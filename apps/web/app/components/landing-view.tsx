'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

import { LearnNav } from '@/components/chrome/learn-nav';
import { Button } from '@/components/ui/button';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import { BLOCK_TYPES, blockMeta } from '@/lib/blocks';
import { formatMinutes } from '@/lib/course-model';
import type { PublicMap } from '@/lib/public-maps';

import { CourseThumb, mapsThatFit } from '../community/course-thumb';
import { AuroraWakes } from './aurora-wakes';
import { useAuthDialog } from './auth-dialog';
import { HeroMap } from './hero-map';
import { HowPath } from './how-path';
import { LearnLockup } from './learn-lockup';
import { UnseenEngineSponsor } from './unseen-engine-sponsor';

const TOPICS = [
  'Intro to Python, from zero',
  'How to read a balance sheet',
  'Starting a small business, step by step',
  'Photosynthesis, explained properly',
  'Spreadsheets for work, from scratch',
  'Building AI agents that actually work',
  'Spanish for adult beginners',
];

/** the hero map frame is 16:11 on desktop */
const HERO_ASPECT = 16 / 11;

const BLOCK_NOTES: Record<(typeof BLOCK_TYPES)[number], string> = {
  ai_text: 'Written lessons with headings, tables and links',
  youtube: 'The best explainer, embedded',
  video: 'Vimeo, Loom, or your own file',
  audio: 'Podcasts and recorded talks',
  image: 'Diagrams with what to notice',
  pdf_extract: 'The key passage from a paper',
  blog: 'An article worth your time',
  resource: 'Docs, datasets, repos',
  embed: 'CodePen, Figma, Slides, sandboxes',
  code: 'Highlighted, copyable examples',
  quiz: 'One answer or several, checked instantly',
  flashcard: 'Flip to recall what you just learned',
};

function TopicInput({
  onBuild,
}: {
  onBuild: (topic: string) => void;
}) {
  return (
    <PlaceholdersAndVanishInput
      placeholders={TOPICS}
      name="topic"
      ariaLabel="What do you want to learn?"
      submitLabel="Watch it build"
      onChange={() => {}}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        const input = e.currentTarget.elements.namedItem('topic');
        const topic =
          input instanceof HTMLInputElement ? input.value.trim() : '';
        if (topic.length >= 2)
          window.setTimeout(() => onBuild(topic), 450);
      }}
      className="h-14 max-w-xl border-star-100/15 bg-night-950/80 backdrop-blur-md"
    />
  );
}

function CommunityCard({ map }: { map: PublicMap }) {
  return (
    <Link
      href={`/share/${map.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-night-800 bg-night-900/40 transition-colors duration-200 hover:border-aurora-400/50"
    >
      <div className="h-44 border-b border-night-800 bg-night-950/60 px-2 py-3">
        <CourseThumb course={map.course} className="size-full" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-semibold group-hover:text-aurora-400">
          {map.title}
        </p>
        {map.topic &&
        map.topic.toLowerCase() !== map.title.toLowerCase() ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-star-400">
            {map.topic}
          </p>
        ) : null}
        <p className="mt-auto pt-4 text-sm text-star-400 tabular-nums">
          by {map.creatorName} · {map.course.lessons} lessons
          {map.course.minutes
            ? ` · ${formatMinutes(map.course.minutes)}`
            : ''}
        </p>
      </div>
    </Link>
  );
}

export function LandingView({
  signedIn,
  maps,
}: {
  signedIn: boolean;
  maps: PublicMap[];
}) {
  const dialog = useAuthDialog();
  const router = useRouter();
  const featured = mapsThatFit(maps, HERO_ASPECT, 4);

  function build(topic: string) {
    if (signedIn) {
      router.push(`/maps/new?topic=${encodeURIComponent(topic)}`);
      return;
    }
    dialog.open({ topic, intent: 'signup' });
  }

  return (
    <main className="flex-1 bg-night-950 text-star-100">
      <LearnNav
        signedIn={signedIn}
        active="learn"
        onSignIn={() => dialog.open({ intent: 'signin' })}
      />

      <section className="relative overflow-hidden">
        <img
          src="/landing/wake-atlas.png"
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-[0.07] dark:opacity-40"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-night-950/30 via-transparent to-night-950"
        />
        <AuroraWakes />
        <div className="pointer-events-none relative z-10 mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-[1320px] items-center gap-12 px-5 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:px-12 lg:py-20">
          <div className="pointer-events-auto">
            <h1 className="max-w-[13ch] text-5xl leading-[1.04] font-light tracking-tight text-balance md:text-6xl xl:text-7xl">
              Learn anything. See the whole map.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-star-400">
              Name a topic and a course agent builds the path: modules
              first, then lessons filled with videos, readings, code,
              quizzes and flashcards, every source credited.
            </p>
            <p className="mt-3 max-w-[46ch] leading-relaxed text-star-300">
              For anyone 13 or older: a student getting ahead, an adult
              changing careers, or someone finally learning the thing
              they always meant to.
            </p>
            <div className="mt-8">
              <TopicInput onBuild={build} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button
                asChild
                variant="outline"
                className="rounded-full"
              >
                <Link href="/community">
                  View community maps <ArrowRight />
                </Link>
              </Button>
              <p className="text-sm text-star-400">
                {signedIn
                  ? "New maps start private. Publish when you're ready."
                  : 'Preview any map. Entering one requires a free account.'}
              </p>
            </div>
          </div>
          {featured.length ? (
            <div className="pointer-events-auto">
              <HeroMap maps={featured} signedIn={signedIn} />
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <HowPath
          maps={maps.map((m) => ({
            title: m.title,
            creatorName: m.creatorName,
            lessons: m.course.lessons,
          }))}
        />

        <section
          aria-labelledby="types-heading"
          className="border-t border-night-800 py-24"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <h2
                id="types-heading"
                className="text-3xl font-bold tracking-tight text-balance md:text-4xl"
              >
                Whatever the lesson needs.
              </h2>
              <p className="mt-5 max-w-[46ch] leading-relaxed text-star-400">
                A lesson is a stack of blocks, in any mix the topic
                calls for. Quizzes and flashcards tell you right away
                whether you&apos;ve got it, and nothing is graded.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-night-800 bg-night-800 sm:grid-cols-2 xl:grid-cols-3">
              {BLOCK_TYPES.map((type) => {
                const meta = blockMeta(type);
                const Icon = meta.icon;
                return (
                  <li
                    key={type}
                    className="flex items-start gap-3 bg-night-950 p-4"
                  >
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-aurora-400"
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {meta.label}
                      </p>
                      <p className="mt-0.5 text-sm text-star-400">
                        {BLOCK_NOTES[type]}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="community-heading"
          className="border-t border-night-800 py-24"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2
                id="community-heading"
                className="text-3xl font-bold tracking-tight md:text-4xl"
              >
                Maps people are already walking.
              </h2>
              <p className="mt-4 max-w-[52ch] leading-relaxed text-star-400">
                Open any of them to see the full route. Enter one to
                learn and keep your place.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full"
            >
              <Link href="/community">
                Browse community maps <ArrowRight />
              </Link>
            </Button>
          </div>
          {maps.length ? (
            <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {maps.slice(0, 3).map((map) => (
                <li key={map.slug}>
                  <CommunityCard map={map} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 rounded-2xl border border-dashed border-night-800 p-8 text-center text-star-400">
              No published maps yet. Build one and be the first.
            </p>
          )}
        </section>

        <section className="py-16">
          <UnseenEngineSponsor variant="billboard" />
        </section>

        <section aria-labelledby="open-heading" className="py-24">
          <div className="grid gap-12 rounded-3xl border border-night-800 bg-night-900/40 p-8 md:p-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2
                id="open-heading"
                className="text-3xl font-bold tracking-tight"
              >
                Open source, MIT licensed.
              </h2>
              <p className="mt-5 max-w-[50ch] leading-relaxed text-star-400">
                EEF Learn is a public good from the Emmanuel Eze
                Foundation, which began by putting 100 children in
                Makoko, Lagos through school and computer training,
                then taught 912 students in eight free bootcamps. EEF
                Learn takes that work to learners of every age, with a
                goal of one million. Self-host it, fork it, bring your
                own model.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-8 rounded-full"
              >
                <a href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn">
                  View the repo
                </a>
              </Button>
            </div>
            <div className="lg:border-l lg:border-night-800 lg:pl-16">
              <h2 className="text-3xl font-bold tracking-tight">
                What will you learn next?
              </h2>
              <p className="mt-5 leading-relaxed text-star-400">
                One topic is all it takes to start a path.
              </p>
              <div className="mt-8">
                <TopicInput onBuild={build} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="flex flex-col gap-6 border-t border-night-800 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <LearnLockup variant="foundation" />
        <UnseenEngineSponsor variant="footer" />
        <nav
          aria-label="Footer"
          className="flex gap-6 text-sm text-star-400"
        >
          <Link className="hover:text-star-100" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-star-100" href="/terms">
            Terms
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
        </nav>
      </footer>
    </main>
  );
}
