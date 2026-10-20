import { getPublicMaps } from "@/lib/public-maps";
import { getSession } from "@/lib/session";

import { CommunityBrowser } from "./community-browser";

export const dynamic = "force-dynamic";

/** Published courses, each shown as its real map. */
export default async function CommunityPage() {
  const session = await getSession();
  const maps = await getPublicMaps();

  return <CommunityBrowser signedIn={Boolean(session)} maps={maps} />;
}
