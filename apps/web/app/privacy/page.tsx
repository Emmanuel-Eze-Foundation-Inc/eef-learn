import Link from "next/link";

import { WaypathMark } from "../components/waypath-mark";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-night-950 px-8 py-6 text-star-100 lg:px-16">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <WaypathMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">EEF Learn</span>
        </Link>
        <Link href="/" className="text-sm text-star-400 hover:text-star-100">
          Back home
        </Link>
      </nav>
      <article className="mx-auto mt-12 max-w-2xl space-y-6 pb-24 leading-relaxed">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">Privacy</p>
        <h1 className="text-4xl font-bold tracking-tight">How we handle your information</h1>
        <p className="text-star-400">
          EEF Learn is run by the Emmanuel Eze Foundation. We collect the least we need to run the
          product, and we do not sell personal data.
        </p>
        <h2 className="pt-4 text-xl font-semibold">What we store</h2>
        <ul className="list-disc space-y-2 pl-5 text-star-400">
          <li>Account: name, email, password hash, and birthdate (used only for the 13+ age gate).</li>
          <li>Learning: maps you create, progress on nodes, companion chat messages, coffee-chat requests.</li>
          <li>Operational: session cookies, daily generation quotas, and job logs for map building.</li>
        </ul>
        <h2 className="pt-4 text-xl font-semibold">What we do not do</h2>
        <ul className="list-disc space-y-2 pl-5 text-star-400">
          <li>We do not sell or rent your data.</li>
          <li>We do not use your learning maps to train third-party foundation models.</li>
          <li>Published maps show your display name and the map itself. Private maps stay private.</li>
        </ul>
        <h2 className="pt-4 text-xl font-semibold">Contact</h2>
        <p className="text-star-400">
          Questions:{" "}
          <a href="https://emmanuelezefoundation.org" className="text-aurora-400 hover:underline">
            emmanuelezefoundation.org
          </a>
          .
        </p>
      </article>
    </main>
  );
}
