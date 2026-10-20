import Link from "next/link";

import {
  FOUNDATION_ADDRESS,
  FOUNDATION_EMAIL,
  FOUNDATION_PHONE,
  FOUNDATION_PHONE_HREF,
  PAGE_SHELL,
} from "@/lib/foundation";
import { getFoundationPosts } from "@/lib/foundation-feed";

import { NightFrame } from "@/components/chrome/night-frame";

import { FoundationNav } from "../../components/foundation-nav";
import { FoundationSocials } from "../../components/foundation-socials";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const posts = await getFoundationPosts();

  return (
    <main className="min-h-dvh overflow-x-clip">
      <FoundationNav />
      <article className={`${PAGE_SHELL} grid gap-12 pb-24 pt-8 lg:grid-cols-2 lg:items-start`}>
        <NightFrame className="min-w-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact</h1>
          <p className="mt-5 max-w-[58ch] leading-relaxed text-star-300">
            Write us about partnerships, volunteering, or the programs. A person on the team reads
            every note.
          </p>
          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-sm font-medium text-star-300">Email</dt>
              <dd className="mt-2 break-all">
                <a className="hover:underline" href={`mailto:${FOUNDATION_EMAIL}`}>
                  {FOUNDATION_EMAIL}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-star-300">Phone</dt>
              <dd className="mt-2">
                <a className="hover:underline" href={FOUNDATION_PHONE_HREF}>
                  {FOUNDATION_PHONE}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-star-300">Office</dt>
              <dd className="mt-2 text-star-300">{FOUNDATION_ADDRESS}</dd>
            </div>
          </dl>
          <p className="mt-12 text-sm text-star-300">
            Prefer a form?{" "}
            <Link href="/#involve" className="font-semibold text-aurora-400 hover:underline">
              Partner or volunteer
            </Link>
            .
          </p>
        </div>
        </NightFrame>
        <FoundationSocials posts={posts} />
      </article>
    </main>
  );
}
