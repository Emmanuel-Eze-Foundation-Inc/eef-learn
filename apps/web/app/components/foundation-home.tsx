import { ArrowRight, ArrowUpRight, CalendarDays, Compass, HandHelping, MessagesSquare, Sparkle } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import {
  FOUNDER_NAME,
  FOUNDER_PHOTO,
  FOUNDER_PORTFOLIO,
  FOUNDATION_ADDRESS,
  FOUNDATION_EMAIL,
  FOUNDATION_PHONE,
  FOUNDATION_PHONE_HREF,
  FOUNDATION_SITE,
  FOUNDATION_SOCIALS,
  PAGE_SHELL,
} from "@/lib/foundation";
import type { FoundationPost } from "@/lib/foundation-feed";
import { BLOCK_TYPES, blockMeta, type BlockType } from "@/lib/blocks";
import type { PublicMap } from "@/lib/public-maps";
import { cn } from "@/lib/utils";

import { CourseThumb, mapsThatFit } from "../community/course-thumb";
import { EefLockup } from "./eef-lockup";
import { FoundationNav } from "./foundation-nav";
import { SOCIAL_ICONS, SocialLinkRow } from "./foundation-socials";
import { InvolveForms } from "./involve-forms";
import { UnseenEngineSponsor } from "./unseen-engine-sponsor";

const H2 = "text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-balance sm:text-[40px]";
const LEAD = "text-[17px] leading-[1.65] text-star-300 sm:text-[18px]";
const PILL =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-colors duration-200";

const PROMISES = ["Free for every family", "Run by volunteers", "Open source"];

const SHOWN_TYPES: BlockType[] = ["youtube", "ai_text", "code", "quiz", "flashcard", "pdf_extract"];

const STATS = [
  { value: "8", label: "free tech bootcamps run" },
  { value: "1,000+", label: "children taught, ages 8 to 19" },
  { value: "Free", label: "for every child. Comparable bootcamps charge $2,500" },
  { value: "1M", label: "completed learning maps by 2035" },
];

const CHAPTERS = [
  {
    title: "Food and school",
    body: "The foundation began by putting meals and schooling within reach of children who had neither. That is still the reason for everything after it.",
    tone: "done",
  },
  {
    title: "Eight free bootcamps",
    body: "Twelve-week programs in math, coding, and design for ages 8 to 19. Eight cohorts, more than a thousand children, no tuition.",
    tone: "done",
  },
  {
    title: "EEF Learn, and a million maps",
    body: "The bootcamp, opened to everyone. Free learning maps anyone can build or follow, with the aim of one million completed by 2035.",
    tone: "next",
  },
] as const;

type Door = {
  title: string;
  body: string;
  icon: ComponentType<{ className?: string }>;
  live: boolean;
  href?: string;
};

const DOORS: Door[] = [
  {
    title: "Learn",
    body: "Free learning maps for any topic, built by a course agent or by hand, and walked one lesson at a time.",
    icon: Compass,
    live: true,
    href: "/learn",
  },
  {
    title: "Meet a mentor",
    body: "Short coffee chats with alumni and volunteers who have walked the same path, matched by a person, not an algorithm.",
    icon: MessagesSquare,
    live: false,
  },
  {
    title: "Ask for help",
    body: "Say what you are stuck on and get matched with someone in the community who can help you through it.",
    icon: HandHelping,
    live: false,
  },
  {
    title: "Show up",
    body: "In-person and virtual events and training series, led by the people who use the maps.",
    icon: CalendarDays,
    live: false,
  },
];

function MapCard({ map }: { map: PublicMap }) {
  return (
    <Link
      href={`/share/${map.slug}`}
      data-theme="dark"
      className="group block overflow-hidden rounded-[22px] border border-white/10 bg-night-950 text-star-100 shadow-[0_30px_80px_-30px_rgba(6,16,12,0.65)]"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{map.title}</p>
          <p className="truncate text-xs text-star-400">
            by {map.creatorName} · {map.course.lessons} lessons
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-star-400 transition-colors group-hover:text-aurora-400" aria-hidden />
      </div>
      <div className="aspect-[16/10] px-2 pb-2">
        <CourseThumb course={map.course} animate minFrame={{ w: 880, h: 560 }} className="size-full" />
      </div>
    </Link>
  );
}

export function FoundationHome({ maps, posts }: { maps: PublicMap[]; posts: FoundationPost[] }) {
  const [heroMap, learnMap] = mapsThatFit(maps, 16 / 10, 2);
  const showcase = learnMap ?? heroMap;

  return (
    <main className="overflow-x-clip">
      <FoundationNav />

      <section
        data-theme="dark"
        className="relative isolate flex min-h-[calc(100svh-72px)] flex-col justify-end overflow-hidden bg-night-950 text-star-100 lg:min-h-[min(calc(100svh-72px),940px)]"
      >
        <img
          src="/foundation/hero-robotics.jpg"
          alt="Three girls wiring and building a small robot together"
          width={2400}
          height={1600}
          fetchPriority="high"
          className="absolute inset-x-0 top-0 -z-10 h-[62%] w-full object-cover object-[45%_20%] sm:h-full lg:left-auto lg:w-[64%] lg:object-[20%_30%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--night-950)_38%,color-mix(in_oklab,var(--night-950)_70%,transparent)_58%,transparent_78%)] sm:bg-[linear-gradient(to_top,var(--night-950)_8%,color-mix(in_oklab,var(--night-950)_80%,transparent)_34%,transparent_68%)] lg:bg-[linear-gradient(to_top,var(--night-950),transparent_28%),linear-gradient(to_right,var(--night-950)_36%,color-mix(in_oklab,var(--night-950)_78%,transparent)_42%,color-mix(in_oklab,var(--night-950)_40%,transparent)_51%,transparent_66%)]"
        />
        <div className={`${PAGE_SHELL} relative grid items-end gap-12 pt-[46vh] pb-14 sm:pt-56 lg:pt-40 lg:pb-20 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]`}>
          <div className="min-w-0">
            <h1 className="max-w-[14ch] text-[42px] leading-[1.02] font-bold tracking-[-0.035em] text-balance sm:text-[60px] lg:text-[68px] xl:text-[80px]">
              Anyone can learn anything. Nobody should do it alone.
            </h1>
            <p className="mt-7 max-w-[52ch] text-[17px] leading-[1.65] text-star-300 sm:text-[19px] lg:max-w-[44ch] xl:max-w-[52ch]">
              The Emmanuel Eze Foundation started with meals and classrooms, then ran eight free
              tech bootcamps for children 8 to 19. Now it builds EEF Learn: free, open-source
              learning maps anyone can follow, with people to learn alongside.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/learn" className={`${PILL} bg-aurora-400 text-ink-900 hover:bg-aurora-400/90`}>
                Start learning on EEF Learn
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href="#involve" className={`${PILL} border-[1.4px] border-star-100 hover:bg-star-100 hover:text-ink-900`}>
                Partner or volunteer
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[15px] font-medium">
              {PROMISES.map((promise) => (
                <li key={promise} className="flex items-center gap-2">
                  <Sparkle className="size-3.5 fill-gold-400 text-gold-400" aria-hidden />
                  {promise}
                </li>
              ))}
            </ul>
          </div>
          {heroMap ? (
            <div className="hidden min-w-0 xl:block">
              <MapCard map={heroMap} />
            </div>
          ) : null}
        </div>
      </section>

      <section aria-label="Impact so far" className="border-y border-night-800 bg-night-900">
        <dl className={`${PAGE_SHELL} grid grid-cols-2 lg:grid-cols-4`}>
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "flex flex-col-reverse justify-end gap-2 py-8 pr-4 sm:py-10",
                i % 2 === 1 && "border-l border-night-800 pl-5 sm:pl-8",
                i >= 2 && "border-t border-night-800 lg:border-t-0",
                i === 2 && "lg:border-l lg:pl-8",
                i === 3 && "lg:pl-8",
              )}
            >
              <dt className="max-w-[24ch] text-sm leading-snug text-star-300 sm:text-[15px]">{stat.label}</dt>
              <dd className={cn("text-[38px] leading-none font-bold tracking-[-0.03em] tabular-nums sm:text-[52px]", i === 3 && "text-aurora-400")}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="mission" aria-labelledby="story-heading" className={`${PAGE_SHELL} scroll-mt-24 py-24 lg:py-32`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h2 id="story-heading" className={H2}>
            From meals and classrooms to a million maps.
          </h2>
          <p className={`max-w-[56ch] ${LEAD}`}>
            The work widened without changing what it is for: children who start with less still
            get to learn. Now anyone with a connection can, too.
          </p>
        </div>
        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          <span aria-hidden className="absolute top-[7px] right-0 left-0 hidden h-px bg-night-800 md:block" />
          <span
            aria-hidden
            className="absolute top-[7px] left-[66%] hidden h-px w-[34%] border-t-2 border-dashed border-gold-400 bg-transparent md:block"
          />
          {CHAPTERS.map((chapter) => (
            <li key={chapter.title} className="relative pl-8 md:pl-0">
              <span aria-hidden className="absolute top-[7px] bottom-[-40px] left-[7px] w-px bg-night-800 md:hidden" />
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 left-0 size-[15px] rounded-full border-[3px] border-night-950 md:relative md:block",
                  chapter.tone === "done" ? "bg-aurora-400" : "bg-gold-400",
                )}
              />
              <h3 className="text-xl font-semibold tracking-tight md:mt-7">{chapter.title}</h3>
              <p className="mt-3 max-w-[40ch] leading-relaxed text-star-300">{chapter.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="learn-heading" className={`${PAGE_SHELL} pb-24 lg:pb-32`}>
        <div data-theme="dark" className="relative overflow-hidden rounded-[32px] bg-night-950 text-star-100 ring-1 ring-white/10">
          <img
            src="/landing/wake-atlas.png"
            alt=""
            width={1920}
            height={1080}
            className="absolute inset-0 size-full object-cover opacity-30"
          />
          <div className="relative grid gap-12 p-7 sm:p-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:p-16">
            <div className="min-w-0">
              <h2 id="learn-heading" className={H2}>
                EEF Learn is the bootcamp, open to everyone.
              </h2>
              <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.65] text-star-400">
                Name a topic and a course agent researches it, lays out the modules, and fills
                each lesson with the best free material, every source credited. Creators shape
                it by hand. Learners see the whole route and keep one lesson in focus.
              </p>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="Lesson content types">
                {SHOWN_TYPES.map((type) => {
                  const meta = blockMeta(type);
                  const Icon = meta.icon;
                  return (
                    <li key={type} className="inline-flex items-center gap-1.5 rounded-full border border-night-800 bg-night-900/70 px-3 py-1.5 text-sm">
                      <Icon className="size-4 text-aurora-400" aria-hidden />
                      {meta.label}
                    </li>
                  );
                })}
                <li className="inline-flex items-center rounded-full px-2 py-1.5 text-sm text-star-400">
                  and {BLOCK_TYPES.length - SHOWN_TYPES.length} more
                </li>
              </ul>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/learn" className={`${PILL} bg-aurora-400 text-ink-900 hover:bg-aurora-400/90`}>
                  Try EEF Learn free <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/community" className={`${PILL} border border-star-100/25 hover:border-star-100/60`}>
                  Browse community maps
                </Link>
              </div>
              <p className="mt-6 text-sm text-star-400">Open source under the MIT license. Self-host it, fork it, bring your own model.</p>
            </div>
            {showcase ? <MapCard map={showcase} /> : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="doors-heading" className="border-t border-night-800 bg-night-900">
        <div className={`${PAGE_SHELL} py-24 lg:py-32`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
            <h2 id="doors-heading" className={H2}>
              Learning is the first door. Three more are being built.
            </h2>
            <p className={`max-w-[56ch] ${LEAD}`}>
              A map gets you started. People keep you going. These are the parts of the community
              we are building next, and each one needs someone to lead it.
            </p>
          </div>
          <ul className="mt-14 grid gap-px overflow-hidden rounded-[24px] border border-night-800 bg-night-800 sm:grid-cols-2 lg:grid-cols-4">
            {DOORS.map((door) => {
              const Icon = door.icon;
              const body = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "grid size-11 place-items-center rounded-2xl",
                        door.live ? "bg-aurora-400 text-ink-900" : "bg-night-950 text-star-100",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        door.live ? "bg-aurora-400/12 text-aurora-400" : "border border-night-800 text-star-300",
                      )}
                    >
                      {door.live ? "Live now" : "In the works"}
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight">{door.title}</h3>
                  <p className="mt-2.5 leading-relaxed text-star-300">{door.body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-semibold text-aurora-400">
                    {door.live ? "Start a map" : "Help lead this"} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </>
              );
              return (
                <li key={door.title} className="bg-night-900">
                  {door.href ? (
                    <Link href={door.href} className="flex h-full flex-col p-7 transition-colors hover:bg-night-950">
                      {body}
                    </Link>
                  ) : (
                    <a href="#involve" className="flex h-full flex-col p-7 transition-colors hover:bg-night-950">
                      {body}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section
        id="founder"
        aria-labelledby="founder-heading"
        className={`${PAGE_SHELL} scroll-mt-24 grid items-center gap-12 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20 lg:py-32`}
      >
        <div className="relative aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[28px]">
          <img
            src={FOUNDER_PHOTO}
            alt={`${FOUNDER_NAME}, founder and president of the Emmanuel Eze Foundation`}
            width={1192}
            height={1600}
            className="absolute inset-0 size-full object-cover object-[center_18%]"
          />
        </div>
        <div className="min-w-0">
          <h2 id="founder-heading" className={H2}>
            {FOUNDER_NAME} started this so nobody learns alone.
          </h2>
          <p className={`mt-6 max-w-[58ch] ${LEAD}`}>
            He is the founder and president of the Emmanuel Eze Foundation. The work began with meals
            and school for children who had neither, grew into eight free tech bootcamps, and is now
            EEF Learn. He still writes the software the foundation runs on.
          </p>
          <p className={`mt-4 max-w-[58ch] ${LEAD}`}>
            From Washington, DC he also founded Unseen Engine, the engineering studio that builds and
            maintains the systems behind this work.
          </p>
          <a
            href={FOUNDER_PORTFOLIO}
            target="_blank"
            rel="noreferrer"
            className={`${PILL} mt-9 border-[1.4px] border-star-100 hover:bg-star-100 hover:text-ink-900`}
          >
            More about Emmanuel <ArrowUpRight className="size-4" aria-hidden />
          </a>
          <div className="mt-12 border-t border-night-800 pt-8">
            <UnseenEngineSponsor variant="official" />
          </div>
        </div>
      </section>

      <section id="involve" aria-labelledby="involve-heading" className="scroll-mt-24 border-t border-night-800 bg-night-900">
        <div className={`${PAGE_SHELL} grid gap-12 py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-32`}>
          <div className="min-w-0">
            <h2 id="involve-heading" className={H2}>
              Bring what you have.
            </h2>
            <p className={`mt-6 max-w-[50ch] ${LEAD}`}>
              There is no donate button here. We would rather have your partnership, your time, or
              your room for an evening.
            </p>
            <dl className="mt-10 flex flex-col gap-6">
              <div>
                <dt className="font-semibold">Partner with the foundation</dt>
                <dd className="mt-1.5 max-w-[48ch] leading-relaxed text-star-300">
                  Schools, companies, cities, and labs that want to run maps, cohorts, or a series
                  with us.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Lead a series or host an event</dt>
                <dd className="mt-1.5 max-w-[48ch] leading-relaxed text-star-300">
                  Teach a topic you know, mentor learners, or open your space for a community night.
                  No events are listed yet, so the first one can be yours.
                </dd>
              </div>
            </dl>
            <p className="mt-10 text-sm text-star-300">
              Prefer email?{" "}
              <a className="font-semibold text-aurora-400 hover:underline" href={`mailto:${FOUNDATION_EMAIL}`}>
                {FOUNDATION_EMAIL}
              </a>
            </p>
          </div>
          <div className="min-w-0 rounded-[24px] border border-night-800 bg-night-950 p-6 sm:p-8 [&>div]:mt-0">
            <InvolveForms />
          </div>
        </div>
      </section>

      <section id="follow" aria-labelledby="follow-heading" className={`${PAGE_SHELL} scroll-mt-24 grid gap-12 py-24 lg:grid-cols-2 lg:gap-20 lg:py-32`}>
        <div className="min-w-0">
          <h2 id="follow-heading" className={H2}>
            Follow the work.
          </h2>
          <p className={`mt-6 max-w-[48ch] ${LEAD}`}>
            Cohorts, new maps, and the people behind them. Real posts from the foundation&apos;s
            own accounts.
          </p>
          {posts.length ? (
            <ol className="mt-10 border-t border-night-800">
              {posts.map((post) => (
                <li key={post.href} className="border-b border-night-800">
                  <a
                    href={post.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-6 py-5"
                  >
                    <span>
                      <span className="block text-[17px] leading-snug font-semibold group-hover:text-aurora-400">
                        {post.title}
                      </span>
                      <span className="mt-1 block text-sm text-star-300">
                        {post.dateLabel ? `${post.dateLabel} · ` : ""}Medium
                      </span>
                    </span>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-star-300 group-hover:text-aurora-400" aria-hidden />
                  </a>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <ul className="grid content-start gap-3 sm:grid-cols-2">
          {FOUNDATION_SOCIALS.map((social, i) => {
            const Icon = SOCIAL_ICONS[social.name];
            return (
              <li key={social.name} className={cn(i === 0 && "sm:col-span-2")}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full items-start gap-4 rounded-[20px] border border-night-800 bg-night-900 p-5 transition-colors hover:border-aurora-400/50"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-night-950">
                    <Icon className="size-5" weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{social.name}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-star-300 group-hover:text-aurora-400" aria-hidden />
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-star-300">{social.handle}</span>
                    <span className="mt-3 block text-sm">{social.about}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <footer data-theme="dark" className="border-t border-white/10 bg-night-950 text-star-100">
        <div className={`${PAGE_SHELL} grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]`}>
          <div className="min-w-0">
            <EefLockup variant="full" />
            <address className="mt-5 flex flex-col gap-1 text-sm text-star-400 not-italic">
              <span>{FOUNDATION_ADDRESS}</span>
              <a className="hover:text-star-100" href={`mailto:${FOUNDATION_EMAIL}`}>
                {FOUNDATION_EMAIL}
              </a>
              <a className="hover:text-star-100" href={FOUNDATION_PHONE_HREF}>
                {FOUNDATION_PHONE}
              </a>
              <span>{FOUNDATION_SITE}</span>
            </address>
            <div className="mt-6">
              <UnseenEngineSponsor variant="official-footer" />
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm text-star-400">
            <a className="hover:text-star-100" href="#mission">
              Our story
            </a>
            <Link className="hover:text-star-100" href="/learn">
              EEF Learn
            </Link>
            <Link className="hover:text-star-100" href="/community">
              Community maps
            </Link>
            <a className="hover:text-star-100" href="#founder">
              Founder
            </a>
            <a className="hover:text-star-100" href="#involve">
              Get involved
            </a>
            <Link className="hover:text-star-100" href="/contact">
              Contact
            </Link>
            <Link className="hover:text-star-100" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-star-100" href="/terms">
              Terms
            </Link>
            <a className="hover:text-star-100" href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn">
              GitHub
            </a>
          </nav>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Social</p>
            <SocialLinkRow tone="night" />
          </div>
        </div>
      </footer>
    </main>
  );
}
