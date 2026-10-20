"use client";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type LayoutGridCard = {
  id: number;
  content: React.ReactNode;
  className: string;
  thumbnail: string;
  alt: string;
  /** CSS object-position for the cropped thumbnail */
  focus?: string;
};

export const LayoutGrid = ({ cards, className }: { cards: LayoutGridCard[]; className?: string }) => {
  const [selected, setSelected] = useState<LayoutGridCard | null>(null);
  const [lastSelected, setLastSelected] = useState<LayoutGridCard | null>(null);

  const close = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLastSelected(selected);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className={cn("relative grid w-full grid-cols-1 gap-4 md:grid-cols-3", className)}>
      {cards.map((card) => {
        const isSelected = selected?.id === card.id;
        return (
          <div key={card.id} className={card.className}>
            <motion.button
              type="button"
              aria-label={isSelected ? `Close: ${card.alt}` : `Open: ${card.alt}`}
              aria-expanded={isSelected}
              onClick={() => {
                if (isSelected) return close();
                setLastSelected(selected);
                setSelected(card);
              }}
              className={cn(
                "group relative block cursor-pointer overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-aurora-400",
                isSelected
                  ? "fixed inset-0 z-[70] m-auto flex h-[min(82svh,760px)] w-[min(92vw,1000px)] flex-col items-center justify-center rounded-2xl bg-black"
                  : cn(
                      "size-full rounded-2xl bg-night-900",
                      lastSelected?.id === card.id && "z-40",
                    ),
              )}
              layoutId={`card-${card.id}`}
            >
              {isSelected ? <SelectedCard content={card.content} id={card.id} /> : null}
              <motion.img
                layoutId={`image-${card.id}-image`}
                src={card.thumbnail}
                alt={card.alt}
                loading="lazy"
                width={1200}
                height={1600}
                style={{ objectPosition: card.focus ?? "center" }}
                className={cn(
                  "absolute inset-0 size-full transition-transform duration-500",
                  isSelected ? "object-contain" : "object-cover group-hover:scale-[1.03]",
                )}
              />
              {!isSelected ? (
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              ) : null}
            </motion.button>
          </div>
        );
      })}
      <motion.div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-[65] bg-night-950 opacity-0",
          selected ? "pointer-events-auto" : "pointer-events-none",
        )}
        animate={{ opacity: selected ? 0.85 : 0 }}
      />
    </div>
  );
};

const SelectedCard = ({ content, id }: { content: React.ReactNode; id: number }) => {
  return (
    <div className="relative z-[60] flex size-full flex-col justify-end rounded-2xl shadow-2xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 z-10 size-full bg-gradient-to-t from-black/85 via-black/30 to-transparent"
      />
      <motion.div
        layoutId={`content-${id}`}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative z-[70] px-6 pb-6 text-white sm:px-8 sm:pb-8"
      >
        {content}
      </motion.div>
    </div>
  );
};
