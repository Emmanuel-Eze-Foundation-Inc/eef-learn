import { getFoundationPosts } from "@/lib/foundation-feed";
import { getPublicMaps } from "@/lib/public-maps";

import { FoundationHome } from "../components/foundation-home";

export const dynamic = "force-dynamic";

export default async function FoundationPage() {
  const [maps, posts] = await Promise.all([getPublicMaps(1), getFoundationPosts()]);
  return <FoundationHome map={maps[0] ?? null} posts={posts} />;
}
