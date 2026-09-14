import Link from "next/link";

import {
  FOUNDER_NAME,
  FOUNDER_PHOTO,
  FOUNDER_PORTFOLIO,
  FOUNDATION_ADDRESS,
  FOUNDATION_EMAIL,
  FOUNDATION_SITE,
  PAGE_SHELL,
} from "@/lib/foundation";
import type { FoundationPost } from "@/lib/foundation-feed";
import type { PublicMap } from "@/lib/public-maps";

import { EefLockup } from "./eef-lockup";
import { FoundationNav } from "./foundation-nav";
import { FoundationSocials, SocialLinkRow } from "./foundation-socials";
import { InvolveForms } from "./involve-forms";
import { MiniConstellation } from "./mini-constellation";
import { UnseenEngineSponsor } from "./unseen-engine-sponsor";

export function FoundationHome({
  map,
  posts,
}: {
  map: PublicMap | null;
  posts: FoundationPost[];
}) {
  return (
    <main className="overflow-x-clip">
      <FoundationNav />

      <section className={`${PAGE_SHELL} grid items-center gap-10 pb-16 pt-8 lg:grid-cols-2 lg:gap-16 lg:pb-20 lg:pt-14`}>
        <div className="min-w-0">
          <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[40px] md:text-6xl lg:text-[56px] lg:leading-[1.08]">
            Anyone can learn anything. Nobody should do it alone.
          </h1>
          <p className="mt-6 max-w-[62ch] text-[17px] leading-[1.58] text-[#3e4a43] sm:text-[19px]">
            Anywhere the internet reaches, the Emmanuel Eze Foundation pairs
            free, open-source learning tools with a human community. Every learner gets a map and a
            person to talk to.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/learn"
              className="inline-flex w-full justify-center rounded-full bg-aurora-400 px-6 py-3.5 text-base font-semibold text-ink-900 sm:w-auto sm:px-8 sm:py-4"
            >
              Start learning on EEF Learn
            </Link>
            <a
              href="#involve"
              className="inline-flex w-full justify-center rounded-full border-[1.4px] border-star-100 px-6 py-3.5 text-base font-semibold sm:w-auto sm:px-8 sm:py-4"
            >
              Get involved
            </a>
          </div>
        </div>
        <div
          data-theme="dark"
          className="h-[260px] w-full min-w-0 overflow-hidden rounded-[20px] bg-night-950 p-4 text-star-100 sm:h-[340px] lg:h-[420px]"
        >
          {map && map.nodes.length > 0 ? (
            <MiniConstellation slug={map.slug} nodes={map.nodes} edges={map.edges} active />
          ) : (
            <p className="flex h-full items-center justify-center text-center text-sm text-star-400">
              Public maps will light this sky.
            </p>
          )}
        </div>
      </section>

      <section id="mission" className={`${PAGE_SHELL} scroll-mt-24 grid gap-10 py-16 lg:grid-cols-2 lg:items-start lg:gap-16 lg:py-20`}>
        <div className="min-w-0">
          <h2 className="text-[28px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[34px]">
            From meals and classrooms to a million maps.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[#3e4a43]">
            We still work so children who start with less can learn. The work widened. Anyone can
            travel a map now, and a person is still waiting at the end.
          </p>
        </div>
        <ol className="relative min-w-0 border-l border-night-800 pl-6 sm:pl-8">
          <li className="pb-10">
            <span className="absolute -left-[5px] mt-2 size-2.5 rounded-full bg-aurora-400" />
            <h3 className="text-xl font-semibold">Food and school</h3>
            <p className="mt-2 leading-relaxed text-[#3e4a43]">
              The foundation began by putting meals and schooling in reach for children who had
              neither.
            </p>
          </li>
          <li className="pb-10">
            <span className="absolute -left-[5px] mt-2 size-2.5 rounded-full bg-aurora-400" />
            <h3 className="text-xl font-semibold">Eight bootcamps, 1,000+ children</h3>
            <p className="mt-2 leading-relaxed text-[#3e4a43]">
              Free 12-week tech bootcamps in math, coding, and design. Ages 8 to 19. The same
              training others price at $2,500. Eight cohorts. More than a thousand children.
            </p>
          </li>
          <li>
            <span className="absolute -left-[5px] mt-2 size-2.5 rounded-full bg-gold-400" />
            <h3 className="text-xl font-semibold">1 million completed maps by 2035</h3>
            <p className="mt-2 leading-relaxed text-[#3e4a43]">
              EEF Learn is the flagship: open maps anyone can travel. The aim is one million
              completed maps by 2035.
            </p>
          </li>
        </ol>
      </section>

      <section className={`${PAGE_SHELL} pb-4`}>
        <div
          data-theme="dark"
          className="flex flex-col items-start justify-between gap-8 overflow-hidden rounded-[20px] bg-night-950 p-6 text-star-100 sm:p-10 lg:flex-row lg:items-center lg:gap-12 lg:p-12"
        >
          <div className="min-w-0 max-w-[62ch]">
            <h2 className="text-[28px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[34px]">
              EEF Learn turns any topic into a living map of the best free knowledge.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-star-400">
              AI builds the constellation. YouTube, blogs, and community maps fill it in, every
              source credited. Finish a map and a real person from our community meets you for
              coffee.
            </p>
          </div>
          <Link
            href="/learn"
            className="inline-flex shrink-0 rounded-full bg-aurora-400 px-6 py-3 text-[15px] font-semibold text-ink-900"
          >
            Try it free
          </Link>
        </div>
      </section>

      <section className={`${PAGE_SHELL} grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20`}>
        <div className="relative h-[240px] w-full overflow-hidden rounded-[20px] sm:h-[360px] lg:h-[440px]">
          <img
            src="/foundation/community.jpg"
            alt="Two people talking over a notebook and a laptop"
            width={1120}
            height={840}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-[28px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[34px]">
            Every finished map ends with a real conversation.
          </h2>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-[#3e4a43]">
            When you light the last star on a map, we offer you a 30-minute coffee chat, matched by
            hand from EEF&apos;s community of alumni and volunteers. No algorithm decides who you
            meet. A person does.
          </p>
        </div>
      </section>

      <section
        id="founder"
        className={`${PAGE_SHELL} scroll-mt-24 grid items-center gap-10 border-t border-night-800 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20`}
      >
        <div className="min-w-0">
          <h2 className="text-[28px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[34px]">
            {FOUNDER_NAME} started this so nobody learns alone.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-[#3e4a43]">
            He is founder and president of the Emmanuel Eze Foundation. The work began with meals and
            school for children who had neither, then eight free tech bootcamps, then EEF Learn: open
            maps anyone can travel. He still writes the software the foundation runs.
          </p>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-[#3e4a43]">
            From Washington, DC he also founded Unseen Engine, the engineering studio that builds and
            stays on the systems behind this work.
          </p>
          <a
            href={FOUNDER_PORTFOLIO}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex w-full justify-center rounded-full border-[1.4px] border-star-100 px-6 py-3 text-[15px] font-semibold sm:w-auto"
          >
            Visit his site
          </a>
        </div>
        <div className="relative order-first h-[360px] w-full overflow-hidden rounded-[20px] sm:h-[480px] lg:order-last lg:h-[560px]">
          <img
            src={FOUNDER_PHOTO}
            alt={`${FOUNDER_NAME}, founder and president of the Emmanuel Eze Foundation`}
            width={1192}
            height={1600}
            className="absolute inset-0 size-full object-cover object-[center_18%]"
          />
        </div>
      </section>

      <section
        id="involve"
        className={`${PAGE_SHELL} scroll-mt-24 grid gap-12 py-16 lg:grid-cols-2 lg:items-start lg:gap-16 lg:py-20`}
      >
        <div className="min-w-0">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] sm:text-[34px]">Get involved</h2>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-[#3e4a43]">
            We are not taking donations on this page. Partner with the work, or volunteer to lead a
            series or host a community event. No public events are listed yet. The next one can be
            yours.
          </p>
          <InvolveForms />
        </div>
        <FoundationSocials posts={posts} />
      </section>

      <footer data-theme="dark" className="bg-night-950 text-star-100">
        <div className={`${PAGE_SHELL} grid gap-10 py-12 md:py-14 lg:grid-cols-3`}>
          <div className="min-w-0">
            <EefLockup variant="short" />
            <p className="mt-3.5 text-sm text-star-400">{FOUNDATION_SITE}</p>
            <p className="mt-1 text-sm text-star-400">{FOUNDATION_ADDRESS}</p>
            <a className="mt-1 block text-sm text-star-400 hover:text-star-100" href={`mailto:${FOUNDATION_EMAIL}`}>
              {FOUNDATION_EMAIL}
            </a>
            <div className="mt-5">
              <UnseenEngineSponsor variant="official-footer" />
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm text-star-400">
            <a className="hover:text-star-100" href="#mission">
              Mission
            </a>
            <Link className="hover:text-star-100" href="/learn">
              EEF Learn
            </Link>
            <a className="hover:text-star-100" href="#founder">
              Founder
            </a>
            <a className="hover:text-star-100" href="#follow">
              Follow
            </a>
            <a
              className="hover:text-star-100"
              href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
            >
              GitHub
            </a>
            <Link className="hover:text-star-100" href="/contact">
              Contact
            </Link>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-star-100">Social</p>
            <SocialLinkRow tone="night" />
          </div>
        </div>
      </footer>
    </main>
  );
}
