import { prisma } from "@eef/db";
import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// Built per request so the build never needs the database.
export const dynamic = "force-dynamic";

const PAGES = ["/", "/learn", "/community", "/contact", "/privacy", "/terms", "/age-policy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const maps = await prisma.map.findMany({
    where: { visibility: "public", nodes: { some: {} } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });
  return [
    ...PAGES.map((path) => ({ url: `${env.AUTH_URL}${path === "/" ? "" : path}` })),
    ...maps.map((m) => ({ url: `${env.AUTH_URL}/share/${m.slug}`, lastModified: m.updatedAt })),
  ];
}
