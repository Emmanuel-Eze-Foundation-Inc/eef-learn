/** URL-safe map slugs: kebab-case topic + short random suffix for uniqueness. */
export function slugifyTopic(topic: string, suffix?: string): string {
  const base = topic
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  const rand = suffix ?? Math.random().toString(36).slice(2, 8);
  return `${base || "map"}-${rand}`;
}

/** Display title from a raw topic: trims and capitalizes the first letter. */
export function titleFromTopic(topic: string): string {
  const t = topic.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
