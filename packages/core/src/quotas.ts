/** Default per-user daily quotas (PLAN.md cost controls). Admin-tunable later. */
export const DEFAULT_QUOTAS = {
  maps_per_day: 3,
  sections_per_day: 30,
  bot_msgs_per_day: 100,
} as const;

export type QuotaKind = keyof typeof DEFAULT_QUOTAS;

/** Next UTC midnight — the shared quota reset boundary. */
export function nextUtcMidnight(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
