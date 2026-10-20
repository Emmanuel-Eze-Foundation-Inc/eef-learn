import Link from "next/link";

import { LearnLockup } from "./learn-lockup";

/** The published policy. Open counsel points stay in docs/launch.md, not on the page. */
export const LEGAL_DRAFT = false;

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/learn" className="flex items-center">
          <LearnLockup />
        </Link>
        <Link href="/learn" className="text-sm text-star-400 hover:text-star-100">
          Back to Learn
        </Link>
      </nav>
      <article className="mx-auto mt-12 max-w-2xl space-y-6 pb-24 leading-relaxed [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:text-star-400 [&_p]:text-star-400 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-aurora-400 [&_a:hover]:underline">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm">Last updated {updated}</p>
        {LEGAL_DRAFT ? (
          <p role="note" className="rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-star-100!">
            Draft. This page is being reviewed by the foundation&apos;s counsel and may change before it is final.
          </p>
        ) : null}
        {children}
      </article>
    </main>
  );
}

export function ToConfirm({ children }: { children: React.ReactNode }) {
  if (!LEGAL_DRAFT) return null;
  return (
    <span className="rounded bg-gold-400/15 px-1.5 py-0.5 font-mono text-xs text-gold-400">To confirm: {children}</span>
  );
}
