/**
 * EEF Learn design tokens — the Aurora system.
 * Source of truth: docs/design/BRAND.md §3 (v2.0, approved 2026-09-13).
 *
 * Roles are strict:
 * - gold = human/earned (mastered stars, traveled path, coffee chats). Gold is never a button.
 * - aurora = machine/offered (CTAs, current position, generation). Aurora is never a reward.
 */

export const colors = {
  dark: {
    night950: "#06100C", // app background (the sky)
    night900: "#0B1A13", // surface / cards
    night800: "#16281F", // elevated surface, borders
    star100: "#EDF5EE", // primary text
    star400: "#8FA89A", // secondary text
    aurora400: "#34D98C", // THE action accent
    aurora600: "#0E7A55", // accent hover
    gold400: "#F2C14E", // earned only
    ink900: "#0F1D17", // text on accent fills
    ok500: "#0E7A55",
    err500: "#C94343",
  },
  light: {
    night950: "#F7F5EF",
    night900: "#FFFFFF",
    night800: "#E3E0D6",
    star100: "#0F1D17",
    star400: "#4A5A50",
    aurora400: "#0E7A55",
    aurora600: "#34D98C",
    gold400: "#F2C14E",
    ink900: "#F7F5EF",
    ok500: "#0E7A55",
    err500: "#C94343",
  },
} as const;

export const radius = {
  card: 12,
  pill: 999,
} as const;

export const typography = {
  display: "Satoshi, Outfit, system-ui, sans-serif",
  body: "Satoshi, Outfit, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

/** Motion grammar — durations in ms. Reduced motion: travel -> 150ms crossfade. */
export const motion = {
  starIgnition: 600,
  cameraTravel: 800,
  auroraPathDrawPerEdge: 400,
  contentArrival: 240,
  modal: 280,
  miniMapNudge: 120,
  reducedMotionCrossfade: 150,
} as const;

export type ThemeName = keyof typeof colors;
