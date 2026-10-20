"use client";
import { motion, useScroll, useTransform } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface TimelineEntry {
  title: string;
  eyebrow?: string;
  content: React.ReactNode;
}

export const Timeline = ({ data, className }: { data: TimelineEntry[]; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry?.contentRect.height ?? 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      <div ref={ref} className="relative pb-10">
        {data.map((item) => (
          <div key={item.title} className="flex justify-start pt-10 md:gap-10 md:pt-28">
            <div className="sticky top-32 z-30 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
              <div className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-night-950">
                <div className="size-4 rounded-full border border-night-800 bg-night-900" />
              </div>
              <div className="hidden md:block md:pl-20">
                {item.eyebrow ? (
                  <p className="font-mono text-xs tracking-[0.08em] text-gold-400 uppercase">{item.eyebrow}</p>
                ) : null}
                <h3 className="mt-2 text-4xl font-bold tracking-[-0.03em] text-star-300 lg:text-5xl">{item.title}</h3>
              </div>
            </div>

            <div className="relative w-full min-w-0 pr-1 pl-20 md:pl-4">
              <div className="mb-5 md:hidden">
                {item.eyebrow ? (
                  <p className="font-mono text-xs tracking-[0.08em] text-gold-400 uppercase">{item.eyebrow}</p>
                ) : null}
                <h3 className="mt-1.5 text-3xl font-bold tracking-[-0.03em] text-star-300">{item.title}</h3>
              </div>
              {item.content}
            </div>
          </div>
        ))}
        <div
          aria-hidden
          style={{ height: height + "px" }}
          className="absolute top-0 left-8 w-[2px] overflow-hidden bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-night-800 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-gold-400 from-[0%] via-aurora-400 via-[10%] to-transparent"
          />
        </div>
      </div>
    </div>
  );
};
