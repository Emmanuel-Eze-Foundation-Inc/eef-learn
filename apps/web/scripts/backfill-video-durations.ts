/**
 * Look up real lengths for video blocks saved before durations were stored.
 *
 *   set -a && . ./.env.local && set +a
 *   pnpm videos:backfill
 */
import { prisma } from "@eef/db";

import { isBlockType } from "../lib/blocks";
import { mediaDurationSeconds } from "../lib/media-duration";

const BATCH = 8;

async function main() {
  const blocks = await prisma.contentBlock.findMany({
    where: { durationSeconds: null, url: { not: null }, type: { in: ["youtube", "video"] } },
    select: { id: true, type: true, url: true },
  });
  let found = 0;
  for (let i = 0; i < blocks.length; i += BATCH) {
    await Promise.all(
      blocks.slice(i, i + BATCH).map(async (b) => {
        if (!isBlockType(b.type)) return;
        const durationSeconds = await mediaDurationSeconds(b.type, b.url);
        if (!durationSeconds) return;
        await prisma.contentBlock.update({ where: { id: b.id }, data: { durationSeconds } });
        found += 1;
      }),
    );
  }
  console.log(`Stored lengths for ${found} of ${blocks.length} video blocks.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
