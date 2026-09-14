export type FoundationPost = {
  title: string;
  href: string;
  dateLabel: string;
};

const MEDIUM_FEED = "https://medium.com/feed/@emmanuelezefoundation";

export async function getFoundationPosts(): Promise<FoundationPost[]> {
  try {
    const res = await fetch(MEDIUM_FEED, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "EEFLearn/1.0 (foundation homepage)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 4)
      .flatMap((match) => {
        const block = match[1] ?? "";
        const title = unwrap(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
        const href = unwrap(block.match(/<link>([\s\S]*?)<\/link>/)?.[1]).split("?")[0];
        const rawDate = unwrap(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]);
        if (!title || !href) return [];
        return [{ title, href, dateLabel: formatFeedDate(rawDate) }];
      });
  } catch {
    return [];
  }
}

function unwrap(value: string | undefined) {
  return (value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function formatFeedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
