"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Owlbert } from "@/components/learn/owlbert";
import { TUTOR } from "@/lib/tutor";

import { CONNECT_HREF } from "./tutor-sheet";

const HINT_SEEN = "eef-owlbert-hint";

/** Owlbert floating in the corner of the lesson. Click him to open the tutor. */
export function TutorDock({ ready, hidden, onOpen }: { ready: boolean; hidden: boolean; onOpen: () => void }) {
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(HINT_SEEN)) return;
    const timer = setTimeout(() => setHint(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    sessionStorage.setItem(HINT_SEEN, "1");
    setHint(false);
  }

  function open() {
    dismiss();
    onOpen();
  }

  return (
    <AnimatePresence>
      {hidden ? null : (
        <motion.div
          key="dock"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          className="fixed right-4 bottom-4 z-30 flex items-end gap-2 md:right-6 md:bottom-6"
        >
          <AnimatePresence>
            {hint ? (
              <motion.div
                key="hint"
                role="status"
                initial={{ opacity: 0, x: 8, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                className="relative mb-6 w-60 origin-bottom-right rounded-2xl rounded-br-sm border border-night-800 bg-night-900 p-3.5 pr-8 text-sm leading-snug text-star-100 shadow-xl shadow-black/20"
              >
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="absolute top-2 right-2 rounded-md p-1 text-star-400 hover:text-star-100"
                >
                  <X className="size-3.5" />
                </button>
                {ready ? (
                  <>
                    <p className="font-semibold">I&apos;m {TUTOR.short}.</p>
                    <p className="mt-1 text-star-400">
                      Stuck on something? Ask me. I&apos;ve read every library in the galaxy and I&apos;m still curious.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">{TUTOR.short} here, mostly asleep.</p>
                    <p className="mt-1 text-star-400">My star drive runs on your model key. Add one and I&apos;ll help with every lesson.</p>
                    <Link
                      href={CONNECT_HREF}
                      onClick={dismiss}
                      className="mt-2 inline-block text-xs font-medium text-aurora-400 underline-offset-2 hover:underline"
                    >
                      Add a model key
                    </Link>
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            onClick={open}
            aria-label={ready ? `Ask ${TUTOR.short}, your tutor` : `${TUTOR.short} needs a model key`}
            className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-aurora-400"
          >
            <span className="absolute inset-2 rounded-full bg-aurora-400/15 blur-xl transition-opacity group-hover:opacity-100 md:opacity-70" />
            <span className="relative block transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-active:scale-95">
              <Owlbert size={76} mood={ready ? "idle" : "asleep"} />
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
