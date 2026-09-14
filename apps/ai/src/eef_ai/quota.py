"""Atomic per-user daily quotas (PLAN.md cost controls, eng E2).

One SQL statement consumes a unit iff the user is under their limit (or the
window has reset), so concurrent jobs can never over-spend. Limits mirror
DEFAULT_QUOTAS in @eef/core.
"""

import uuid
from datetime import UTC, datetime, timedelta

import asyncpg

DEFAULT_LIMITS = {
    "maps_per_day": 3,
    "sections_per_day": 30,
    "bot_msgs_per_day": 100,
}


class QuotaExceeded(Exception):
    def __init__(self, kind: str, limit: int):
        self.kind = kind
        self.limit = limit
        super().__init__(f"quota exceeded: {kind} (limit {limit}/day, resets at UTC midnight)")


def next_utc_midnight(now: datetime | None = None) -> datetime:
    """Naive UTC datetime (Prisma DateTime columns are timestamp without time zone)."""
    now = now or datetime.now(UTC).replace(tzinfo=None)
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


async def consume(conn: asyncpg.Connection | asyncpg.Pool, user_id: str, kind: str) -> None:
    """Consume one unit of `kind` for the user or raise QuotaExceeded. Atomic."""
    limit = DEFAULT_LIMITS[kind]
    row = await conn.fetchrow(
        """
        INSERT INTO "Quota" (id, "userId", kind, used, "limit", "resetsAt", "updatedAt")
        VALUES ($1, $2, $3, 1, $4, $5, now())
        ON CONFLICT ("userId", kind) DO UPDATE SET
            used = CASE WHEN "Quota"."resetsAt" <= now() THEN 1 ELSE "Quota".used + 1 END,
            "resetsAt" = CASE WHEN "Quota"."resetsAt" <= now()
                              THEN EXCLUDED."resetsAt" ELSE "Quota"."resetsAt" END,
            "updatedAt" = now()
        WHERE "Quota".used < "Quota"."limit" OR "Quota"."resetsAt" <= now()
        RETURNING used
        """,
        f"quota_{uuid.uuid4().hex}",
        user_id,
        kind,
        limit,
        next_utc_midnight(),
    )
    if row is None:
        raise QuotaExceeded(kind, limit)
