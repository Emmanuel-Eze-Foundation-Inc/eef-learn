/** Fallback spacing; live maps use viewport gutters via trackSpacing(). */
export const SPACING_X = 580;
/** Slight depth so the ribbon has a 3D map feel, not a flat strip. */
export const DEPTH_Z = 88;
/** Sit in front of the ribbon so the plate is the station you are on. */
export const CAMERA_DOLLY = 160;

export type PathPoint = { x: number; y: number; z: number };

export function px(n: number): number {
  return Math.round(n);
}

/**
 * Map ribbon: travel is left ↔ right. Y curves like a trail.
 * Z weaves so the line has depth. Index 0 is the start (left).
 */
export function pathPoint(index: number, spacing = SPACING_X): PathPoint {
  return {
    x: px(index * spacing),
    y: px(Math.sin(index * 0.82) * 72),
    z: px(Math.cos(index * 0.51) * DEPTH_Z),
  };
}

/** Half-width of the lesson plate — ribbon stops here instead of running behind it. */
export function plateHalfWidth(viewportWidth: number): number {
  return Math.min(348, Math.max(0, viewportWidth / 2 - 40));
}

/** Park prev/next stops in the gutters, outside the plate. */
export function trackSpacing(viewportWidth: number): number {
  const plateHalf = plateHalfWidth(viewportWidth);
  const gutter = Math.max(80, viewportWidth / 2 - plateHalf);
  return Math.round(plateHalf + Math.min(Math.max(gutter * 0.58, 96), 156));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

export function cameraAt(progress: number, count: number, spacing = SPACING_X): PathPoint {
  const max = Math.max(count - 1, 0);
  const t = Math.min(Math.max(progress, 0), max);
  return pathPoint(t, spacing);
}

export function lerpPoints(a: PathPoint, b: PathPoint, t: number): PathPoint {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/** Align a CSS bar from a → b in the same 3D space as pathPoint. */
export function barBetween(a: PathPoint, b: PathPoint): { length: number; transform: string } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const mz = (a.z + b.z) / 2;
  const yaw = Math.atan2(-dz, dx);
  const pitch = Math.atan2(-dy, Math.hypot(dx, dz));
  return {
    length,
    transform: `translate3d(${px(mx)}px, ${px(my)}px, ${px(mz)}px) rotateY(${yaw}rad) rotateZ(${pitch}rad)`,
  };
}

/** Lesson titles are often "topic: Stage". In-world we show the stage. */
export function shortTitle(title: string): string {
  const i = title.lastIndexOf(":");
  return i >= 0 ? title.slice(i + 1).trim() : title;
}

export function easeOutCubic(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - x) ** 3;
}

/** Screen offset so a beat's plate sits on the same ribbon as pathPoint(index). */
export function worldOffset(
  index: number,
  progress: number,
  count: number,
  spacing = SPACING_X,
): { x: number; y: number } {
  const p = pathPoint(index, spacing);
  const c = cameraAt(progress, count, spacing);
  return { x: p.x - c.x, y: p.y - c.y };
}
