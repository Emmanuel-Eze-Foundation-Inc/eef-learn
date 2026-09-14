/**
 * Allow only same-origin relative paths for post-auth redirects.
 * Blocks protocol-relative URLs, backslash tricks, and absolute URLs.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.includes("://")) {
    return fallback;
  }
  return raw;
}
