"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/report-error";

import "./globals.css";

/** Replaces the root layout when it fails, so it brings its own <html> and stays dependency-light. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <body className="grid min-h-svh place-items-center bg-night-950 px-6 text-center text-star-100">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">EEF Learn hit a snag</h1>
          <p className="mt-3 leading-relaxed text-star-400">
            It&apos;s been reported, and your progress is saved. Try again in a moment.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-aurora-400 px-5 py-2.5 text-sm font-semibold text-ink-900"
            >
              Try again
            </button>
            <a href="/learn" className="rounded-full border border-night-800 px-5 py-2.5 text-sm font-semibold">
              Back to Learn
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
