import type { Metadata } from "next";

import { getPublicMaps } from "@/lib/public-maps";
import { getSession } from "@/lib/session";

import { LandingView } from "../components/landing-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EEF Learn",
  description:
    "Learn anything. See the whole map. Community-led learning maps by the Emmanuel Eze Foundation.",
  icons: {
    icon: [{ url: "/brand/learn-favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/brand/learn-apple-touch-180.png",
  },
  openGraph: {
    title: "EEF Learn",
    description:
      "Learn anything. See the whole map. Community-led learning maps by the Emmanuel Eze Foundation.",
    images: [{ url: "/brand/learn-og-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EEF Learn",
    images: ["/brand/learn-og-1200x630.png"],
  },
};

export default async function LearnLanding() {
  const session = await getSession();
  const maps = await getPublicMaps(6);

  return <LandingView signedIn={Boolean(session)} maps={maps} />;
}
