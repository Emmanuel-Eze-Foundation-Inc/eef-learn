"use client";

import Link from "next/link";
import { useState } from "react";

import { PAGE_SHELL } from "@/lib/foundation";

import { EefLockup } from "./eef-lockup";

const navLink = "text-[15px] font-medium text-[#3e4a43] hover:text-star-100";

export function FoundationNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={`${PAGE_SHELL} py-5`}>
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center">
          <span className="sm:hidden">
            <EefLockup variant="short" />
          </span>
          <span className="hidden sm:flex">
            <EefLockup variant="full" />
          </span>
        </Link>
        <div className="hidden items-center gap-5 text-[15px] lg:flex lg:gap-8">
          <a className={navLink} href="#mission">
            Mission
          </a>
          <Link className={navLink} href="/learn">
            EEF Learn
          </Link>
          <a className={navLink} href="#founder">
            Founder
          </a>
          <a className={navLink} href="#follow">
            Follow
          </a>
          <a
            href="#involve"
            className="rounded-full bg-star-100 px-6 py-2.5 text-sm font-semibold text-ink-900"
          >
            Get involved
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <a
            href="#involve"
            className="rounded-full bg-star-100 px-4 py-2 text-sm font-semibold text-ink-900"
          >
            Get involved
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="foundation-menu"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-night-800 px-3 py-2 text-sm font-semibold"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <div
          id="foundation-menu"
          className="mt-4 flex flex-col gap-1 border-t border-night-800 pt-3 lg:hidden"
        >
          <a className="rounded-xl px-3 py-2.5 text-[15px] font-medium" href="#mission" onClick={() => setOpen(false)}>
            Mission
          </a>
          <Link className="rounded-xl px-3 py-2.5 text-[15px] font-medium" href="/learn">
            EEF Learn
          </Link>
          <a className="rounded-xl px-3 py-2.5 text-[15px] font-medium" href="#founder" onClick={() => setOpen(false)}>
            Founder
          </a>
          <a className="rounded-xl px-3 py-2.5 text-[15px] font-medium" href="#follow" onClick={() => setOpen(false)}>
            Follow
          </a>
          <Link className="rounded-xl px-3 py-2.5 text-[15px] font-medium" href="/contact">
            Contact
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
