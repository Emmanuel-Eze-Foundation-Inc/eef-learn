export const MIN_AGE_YEARS = 13;

/** True if the person born on `birthdate` is at least `years` old at `now`. Date-only, UTC. */
export function isAtLeastYearsOld(birthdate: Date, years: number, now: Date = new Date()): boolean {
  const threshold = Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate());
  const born = Date.UTC(birthdate.getUTCFullYear(), birthdate.getUTCMonth(), birthdate.getUTCDate());
  return born <= threshold;
}

/** Parse + validate a birthdate string for the signup age gate. Returns null when invalid or under-age. */
export function parseEligibleBirthdate(input: string, now: Date = new Date()): Date | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  if (d > now) return null;
  if (now.getFullYear() - d.getFullYear() > 120) return null;
  return isAtLeastYearsOld(d, MIN_AGE_YEARS, now) ? d : null;
}
