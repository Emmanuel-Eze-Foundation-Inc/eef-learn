import { getFoundationPosts } from "@/lib/foundation-feed";
import { getPublicMaps } from "@/lib/public-maps";

import { FoundationHome } from "../components/foundation-home";

export const dynamic = "force-dynamic";

export default async function FoundationPage() {
  const [maps, posts] = await Promise.all([getPublicMaps(12), getFoundationPosts()]);
  return <FoundationHome maps={maps} posts={posts} />;
}
