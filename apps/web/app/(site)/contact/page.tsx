import Link from "next/link";

import {
  FOUNDATION_ADDRESS,
  FOUNDATION_EMAIL,
  FOUNDATION_PHONE,
  FOUNDATION_PHONE_HREF,
  PAGE_SHELL,
} from "@/lib/foundation";
import { getFoundationPosts } from "@/lib/foundation-feed";

import { EefLockup } from "../../components/eef-lockup";
import { FoundationSocials } from "../../components/foundation-socials";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const posts = await getFoundationPosts();

  return (
    <main className="min-h-dvh overflow-x-clip">
      <nav className={`${PAGE_SHELL} flex items-center justify-between gap-3 py-6`}>
        <Link href="/" className="flex min-w-0 items-center">
          <span className="sm:hidden">
            <EefLockup variant="short" />
          </span>
          <span className="hidden sm:flex">
            <EefLockup variant="full" />
          </span>
        </Link>
        <Link href="/" className="shrink-0 text-sm text-star-400 hover:text-star-100">
          Back
        </Link>
      </nav>
      <article className={`${PAGE_SHELL} grid gap-12 pb-24 pt-8 lg:grid-cols-2 lg:items-start`}>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact</h1>
          <p className="mt-5 max-w-[58ch] leading-relaxed text-[#3e4a43]">
            Write us about partnerships, volunteering, or the programs. A person on the team reads
            every note.
          </p>
          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-sm font-medium text-[#3e4a43]">Email</dt>
              <dd className="mt-2 break-all">
                <a className="hover:underline" href={`mailto:${FOUNDATION_EMAIL}`}>
                  {FOUNDATION_EMAIL}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[#3e4a43]">Phone</dt>
              <dd className="mt-2">
                <a className="hover:underline" href={FOUNDATION_PHONE_HREF}>
                  {FOUNDATION_PHONE}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[#3e4a43]">Office</dt>
              <dd className="mt-2 text-[#3e4a43]">{FOUNDATION_ADDRESS}</dd>
            </div>
          </dl>
          <p className="mt-12 text-sm text-[#3e4a43]">
            Prefer a form?{" "}
            <Link href="/#involve" className="font-semibold text-aurora-400 hover:underline">
              Partner or volunteer
            </Link>
            .
          </p>
        </div>
        <FoundationSocials posts={posts} />
      </article>
    </main>
  );
}
