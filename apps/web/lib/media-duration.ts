import { youtubeId, type BlockType } from "./blocks";

const LENGTH = /"lengthSeconds":"(\d+)"/;

/**
 * The real length of a block's video in seconds, or null when unknown.
 * Best-effort: reads the public watch page (no API key), so callers must
 * treat null as "fall back to the type estimate", never as an error.
 */
export async function mediaDurationSeconds(type: BlockType, url: string | null): Promise<number | null> {
  if (type !== "youtube" && type !== "video") return null;
  const id = youtubeId(url);
  if (!id) return null;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { "accept-language": "en-US,en;q=0.9", "user-agent": "Mozilla/5.0 (EEF Learn)" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const seconds = Number((await res.text()).match(LENGTH)?.[1]);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}
