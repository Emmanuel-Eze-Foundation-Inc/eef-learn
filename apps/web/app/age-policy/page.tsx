import Link from "next/link";

import { LearnLockup } from "../components/learn-lockup";

export default function AgePolicyPage() {
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
      <article className="mx-auto mt-12 max-w-2xl space-y-6 pb-24 leading-relaxed">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-aurora-400">Age policy</p>
        <h1 className="text-4xl font-bold tracking-tight">EEF Learn is for learners 13 and up.</h1>
        <p className="text-star-400">
          When you create an account we ask for your birthdate and reject sign-ups under 13. We
          store that date only to enforce the gate.
        </p>
        <p className="text-star-400">
          Automated mentor matching is not in this version. Community maps and events are how
          learners find other people. Swipe-style matching in a later release will exclude under-18
          learners until a dedicated trust-and-safety design lands.
        </p>
        <p className="text-star-400">
          If you believe an under-13 account exists, write to the foundation via{" "}
          <a href="/contact" className="text-aurora-400 hover:underline">
            Contact the foundation
          </a>
          .
        </p>
      </article>
    </main>
  );
}
