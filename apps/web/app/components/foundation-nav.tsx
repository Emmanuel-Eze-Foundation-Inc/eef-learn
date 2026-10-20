"use client";

import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/chrome/theme-toggle";
import { PAGE_SHELL } from "@/lib/foundation";

import { EefLockup } from "./eef-lockup";

const navLink = "text-[15px] font-medium text-star-300 transition-colors hover:text-star-100";

const LINKS = [
  { label: "Our story", href: "/#mission" },
  { label: "Makoko", href: "/#makoko" },
  { label: "EEF Learn", href: "/learn" },
  { label: "Founder", href: "/#founder" },
  { label: "Follow", href: "/#follow" },
  { label: "Contact", href: "/contact" },
];

export function FoundationNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-night-950/85 backdrop-blur-md supports-[backdrop-filter]:bg-night-950/70">
      <nav aria-label="Foundation" className={`${PAGE_SHELL} py-4`}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Emmanuel Eze Foundation home" className="flex min-w-0 items-center">
            <span className="sm:hidden">
              <EefLockup variant="short" />
            </span>
            <span className="hidden sm:flex">
              <EefLockup variant="full" />
            </span>
          </Link>
          <div className="hidden items-center gap-7 lg:flex">
            {LINKS.map((link) => (
              <Link key={link.label} className={navLink} href={link.href}>
                {link.label}
              </Link>
            ))}
            <ThemeToggle className="size-10" />
            <Link
              href="/#involve"
              className="rounded-full bg-star-100 px-6 py-2.5 text-sm font-semibold text-ink-900 transition-opacity hover:opacity-90"
            >
              Get involved
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <ThemeToggle className="size-10" />
            <Link href="/#involve" className="rounded-full bg-star-100 px-4 py-2 text-sm font-semibold text-ink-900">
              Get involved
            </Link>
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
          <div id="foundation-menu" className="mt-4 flex flex-col gap-1 border-t border-night-800 pt-3 lg:hidden">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                className="rounded-xl px-3 py-2.5 text-[15px] font-medium"
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </nav>
    </header>
  );
}
