"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { LearnScene, type SceneMap } from "./learn-scenes";

const STEPS = [
  {
    title: "Name a topic, or pick a map.",
    body: "Type what you want to learn, or open a map someone already published. Previewing any map is free.",
  },
  {
    title: "The course agent lays out the modules.",
    body: "It researches the topic on the web, then drafts the modules first, so you see the whole route before a single lesson is written.",
  },
  {
    title: "Then it fills every lesson.",
    body: "Videos, readings, articles, code, quizzes, flashcards. Each block names where it came from, and you can rewrite any of them.",
  },
  {
    title: "Shape the path in the studio.",
    body: "Switch between Chat, Map, and Document. Nest lessons under modules, draw what has to come first, add or delete anything.",
  },
  {
    title: "Publish, then walk it.",
    body: "Make it public in Community maps, or private so people ask to join and you approve. Learners keep one lesson in focus while the map shows what's done and what's next.",
  },
];

const AUTOPLAY_MS = 6000;
const HOLD_MS = 12000;

/** Landing how-it-works: the real create → shape → publish → learn loop. */
export function HowPath({ maps }: { maps: SceneMap[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const held = useRef(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [markY, setMarkY] = useState(0);

  function choose(index: number) {
    held.current = true;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      held.current = false;
    }, HOLD_MS);
    setActive(index);
  }

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const items = itemRefs.current.filter((el): el is HTMLLIElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        const index = items.indexOf(hit.target as HTMLLIElement);
        if (index >= 0) choose(index);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (held.current) return;
      setActive((i) => (i + 1) % STEPS.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  useEffect(() => {
    const el = itemRefs.current[active];
    if (el) setMarkY(el.offsetTop);
  }, [active]);

  return (
    <section id="how" ref={rootRef} aria-labelledby="how-heading" className="scroll-mt-24 py-24 lg:py-32">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:gap-20">
        <div>
          <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-balance md:text-5xl">
            The sky is the syllabus.
          </h2>
          <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-star-400">
            A map is a real course: modules, lessons, and every kind of content, laid out as a path
            you can see end to end. Here is how one comes together.
          </p>

          <ol className="relative mt-12 max-w-[58ch] pl-10">
            <span aria-hidden className="absolute top-3 bottom-3 left-[11px] w-px bg-night-800" />
            <span
              aria-hidden
              className="absolute left-[5px] size-[13px] rounded-full bg-aurora-400 shadow-[0_0_14px_rgba(52,217,140,0.5)] transition-transform duration-500 ease-[var(--ease-out)] motion-reduce:transition-none"
              style={{ transform: `translateY(${markY + 8}px)`, top: 0 }}
            />
            {STEPS.map((step, i) => {
              const state = i === active ? "here" : i < active ? "done" : "ahead";
              return (
                <li
                  key={step.title}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className="relative pb-3"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-[11px] -left-[34px] size-[9px] rounded-full border",
                      state === "done" && "border-gold-400 bg-gold-400",
                      state === "here" && "border-aurora-400 bg-night-950",
                      state === "ahead" && "border-dashed border-star-400 bg-night-950",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-current={state === "here" ? "step" : undefined}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-left transition-colors duration-200",
                      state === "here" ? "bg-night-900/80" : "hover:bg-night-900/40",
                    )}
                  >
                    <span className={cn("block font-semibold", state !== "here" && "text-star-100/80")}>{step.title}</span>
                    <span
                      className={cn(
                        "mt-1.5 block leading-relaxed text-star-400",
                        state === "here" ? "" : "line-clamp-1 lg:line-clamp-none",
                      )}
                    >
                      {step.body}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 lg:hidden">
            <LearnScene step={active} maps={maps} />
          </div>
        </div>

        <div className="hidden lg:sticky lg:top-28 lg:block">
          <LearnScene step={active} maps={maps} />
        </div>
      </div>
    </section>
  );
}
