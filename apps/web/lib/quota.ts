import { DEFAULT_QUOTAS, nextUtcMidnight, type QuotaKind } from "@eef/core";
import { prisma, Prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";

/**
 * Atomically consume one unit of a daily quota (mirrors apps/ai quota.py).
 * Returns false when the user is at their limit for the current window.
 */
export async function consumeQuota(userId: string, kind: QuotaKind): Promise<boolean> {
  const limit = DEFAULT_QUOTAS[kind];
  const rows = await prisma.$queryRaw<{ used: number }[]>(Prisma.sql`
    INSERT INTO "Quota" (id, "userId", kind, used, "limit", "resetsAt", "updatedAt")
    VALUES (${`quota_${createId()}`}, ${userId}, ${kind}, 1, ${limit}, ${nextUtcMidnight()}, now())
    ON CONFLICT ("userId", kind) DO UPDATE SET
      used = CASE WHEN "Quota"."resetsAt" <= now() THEN 1 ELSE "Quota".used + 1 END,
      "resetsAt" = CASE WHEN "Quota"."resetsAt" <= now()
                        THEN EXCLUDED."resetsAt" ELSE "Quota"."resetsAt" END,
      "updatedAt" = now()
    WHERE "Quota".used < "Quota"."limit" OR "Quota"."resetsAt" <= now()
    RETURNING used
  `);
  return rows.length > 0;
}
