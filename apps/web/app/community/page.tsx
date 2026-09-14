import { getPublicMaps } from "@/lib/public-maps";
import { getSession } from "@/lib/session";

import { CommunityAtlas } from "../components/community-atlas";

export const dynamic = "force-dynamic";

/** Public atlas of published maps. Search ignites matching stars. */
export default async function CommunityPage() {
  const session = await getSession();
  const maps = await getPublicMaps();

  return <CommunityAtlas signedIn={Boolean(session)} maps={maps} />;
}
