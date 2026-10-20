"use client";

import Link from "next/link";

import { LearnLockup } from "@/app/components/learn-lockup";
import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LearnNav({
  signedIn,
  onSignIn,
  active,
  className,
}: {
  signedIn: boolean;
  onSignIn?: () => void;
  active?: "learn" | "community" | "dashboard";
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between gap-4 bg-night-950/55 px-5 py-4 backdrop-blur-md lg:px-12",
        className,
      )}
    >
      <Link href="/learn" className="flex shrink-0 items-center">
        <LearnLockup />
      </Link>
      <div className="flex items-center gap-4 text-sm whitespace-nowrap text-star-400 sm:gap-5">
        <a className="hidden hover:text-star-100 sm:inline" href="/learn#how">
          How it works
        </a>
        <Link
          href="/community"
          className={cn("hover:text-star-100", active === "community" && "text-star-100")}
        >
          Community maps
        </Link>
        <a
          className="hidden hover:text-star-100 md:inline"
          href="https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn"
        >
          GitHub
        </a>
        <ThemeToggle />
        {signedIn ? (
          <Button asChild size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onSignIn}>
            Sign in
          </Button>
        )}
      </div>
    </nav>
  );
}
