"use client";

import { useSyncExternalStore } from "react";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "eef-theme-change";

export function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function resolvedTheme(): Theme {
  const saved = document.documentElement.dataset.theme;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The theme actually on screen: a saved choice, or the OS preference. */
export function useResolvedTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, resolvedTheme, () => "dark" as Theme);
}
