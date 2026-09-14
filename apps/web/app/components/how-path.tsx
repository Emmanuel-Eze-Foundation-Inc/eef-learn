"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { CreationLoopScenes } from "./creation-loop-scenes";

const STEPS = [
  {
    title: "Name or pick what you want to learn.",
    body: "Type a topic, or open a map someone already published. The path starts from that choice.",
  },
  {
    title: "Ask AI to build it, or start blank.",
    body: "A key lets the model draft the map from a few questions. Starting blank, you place every lesson yourself.",
  },
  {
    title: "Shape the path.",
    body: "Nest a lesson under a lesson. Draw what has to come first. Children and grandchildren sit on the same sky.",
  },
  {
    title: "Fill each beat.",
    body: "Watch, read, the idea, recall, check. You write them, or you ask the model to. Every clip and paragraph names its source.",
  },
  {
    title: "Launch, then enter.",
    body: "Publish when you are ready. One beat fills the stage. Previous and next sit at the edges. Scroll continues.",
  },
];

function arriveStyle(visible: boolean, delayMs: number, reduce: boolean): CSSProperties {
  if (!visible) return { opacity: 0 };
  if (reduce) return { opacity: 1 };
  return {
    animation: "arrive 240ms var(--ease-out) both",
    animationDelay: `${delayMs}ms`,
  };
}

function stepState(index: number, active: number): "offered" | "here" | "ahead" {
  if (index === active) return "here";
  if (index < active) return "offered";
  return "ahead";
}

function StepDot({ state }: { state: "offered" | "here" | "ahead" }) {
  switch (state) {
    case "here":
      return (
        <span
          className="absolute -left-[35px] top-1.5 h-2.5 w-2.5 rounded-full border border-aurora-400 bg-night-950"
          aria-hidden="true"
        />
      );
    case "offered":
      return (
        <span
          className="absolute -left-[35px] top-1.5 h-2.5 w-2.5 rounded-full border border-gold-400 bg-gold-400"
          aria-hidden="true"
        />
      );
    case "ahead":
      return (
        <span
          className="absolute -left-[35px] top-1.5 h-2.5 w-2.5 rounded-full border border-dashed border-star-400 bg-night-950"
          aria-hidden="true"
        />
      );
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

/** Landing how-it-works: create, nest, launch, then travel — the real loop. */
export function HowPath() {
  const rootRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [active, setActive] = useState(0);
  const [markY, setMarkY] = useState(6);
  const pauseUntil = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);

    const el = rootRef.current;
    if (!el) {
      return () => mq.removeEventListener("change", apply);
    }
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return () => mq.removeEventListener("change", apply);
    }

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "-80px 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => {
      mq.removeEventListener("change", apply);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const items = itemRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!items.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const index = items.indexOf(hit.target as HTMLLIElement);
        if (index >= 0) {
          pauseUntil.current = Date.now() + 4000;
          setActive(index);
        }
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.25, 0.6] },
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    const el = itemRefs.current[active];
    if (!el) return;
    setMarkY(el.offsetTop + 6);
  }, [active, visible]);

  useEffect(() => {
    if (!visible || reduce) return;
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      setActive((i) => (i + 1) % STEPS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [visible, reduce]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!visible) return;
      if (e.key === "ArrowRight") {
        pauseUntil.current = Date.now() + 4000;
        setActive((i) => Math.min(STEPS.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        pauseUntil.current = Date.now() + 4000;
        setActive((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const spineOpen = visible || reduce;

  return (
    <section id="how" ref={rootRef} className="scroll-mt-24 py-24">
      <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:gap-16">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={arriveStyle(visible, 0, reduce)}
          >
            Name it. Shape the path. Travel it.
          </h2>
          <p
            className="mt-5 max-w-[58ch] text-lg leading-relaxed text-star-400"
            style={arriveStyle(visible, 40, reduce)}
          >
            The sky is the syllabus. You make the map — or pick one — then you stay with the
            lesson in front of you. What you finished stays lit. What is next waits at the edge.
          </p>
          <ol className="relative mt-12 max-w-[58ch] pl-8">
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-0 top-2 w-px bg-night-800 motion-reduce:[clip-path:inset(0)]"
              style={{
                clipPath: spineOpen ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
                transition: reduce ? "none" : "clip-path 600ms var(--ease-in-out)",
              }}
            />
            <span
              aria-hidden="true"
              className="absolute -left-[37px] top-0 h-3.5 w-3.5 rounded-full bg-aurora-400 shadow-[0_0_12px_rgba(52,217,140,0.45)] motion-safe:animate-[aurora-halo_3.2s_var(--ease-out)_infinite] motion-reduce:opacity-90"
              style={{
                transform: `translateY(${markY}px)`,
                transition: reduce ? "none" : "transform 500ms var(--ease-out)",
              }}
            />
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="relative pb-10 last:pb-0"
                style={arriveStyle(visible, 80 + i * 60, reduce)}
              >
                <StepDot state={stepState(i, active)} />
                <p className="font-semibold">{step.title}</p>
                <p className="mt-2 text-star-400">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 lg:hidden" style={arriveStyle(visible, 200, reduce)}>
            <CreationLoopScenes step={active} />
          </div>
        </div>

        <div className="hidden lg:sticky lg:top-28 lg:block" style={arriveStyle(visible, 160, reduce)}>
          <CreationLoopScenes step={active} />
        </div>
      </div>
    </section>
  );
}
