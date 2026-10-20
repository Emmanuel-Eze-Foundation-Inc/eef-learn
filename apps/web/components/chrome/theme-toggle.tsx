"use client";

import { Moon, Sun } from "lucide-react";

import { setTheme, useResolvedTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useResolvedTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border border-night-800 text-star-300 transition-colors hover:border-star-400 hover:text-star-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <Icon className="size-[17px]" aria-hidden />
    </button>
  );
}
