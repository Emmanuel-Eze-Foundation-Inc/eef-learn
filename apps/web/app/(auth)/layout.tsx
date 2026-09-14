import Link from "next/link";

import { LearnLockup } from "../components/learn-lockup";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-night-950 text-star-100">
      <nav className="flex items-center px-8 py-6 lg:px-16">
        <Link href="/learn" className="flex items-center">
          <LearnLockup />
        </Link>
      </nav>
      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
