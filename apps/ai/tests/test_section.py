"""Section pipeline + quota tests (T6). DB-backed; skipped without TEST_DATABASE_URL."""

import asyncio
import json
import os
import uuid

import asyncpg
import pytest

from eef_ai.pipelines.section import handle_section
from eef_ai.quota import QuotaExceeded, consume
from eef_ai.worker import claim_job, register_handler, run_job

TEST_DB = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_DB, reason="TEST_DATABASE_URL not set")


@pytest.fixture
async def pool():
    p = await asyncpg.create_pool(TEST_DB, min_size=1, max_size=5)
    yield p
    await p.close()


@pytest.fixture
async def fixture_ids(pool):
    uid = f"test-{uuid.uuid4().hex[:12]}"
    await pool.execute(
        """INSERT INTO "User" (id, email, name, birthdate, "updatedAt")
           VALUES ($1, $2, 'Section Test', '1990-01-01', now())""",
        uid,
        f"{uid}@test.local",
    )
    map_id = f"map-{uuid.uuid4().hex[:12]}"
    await pool.execute(
        """INSERT INTO "Map" (id, slug, title, topic, "creatorId", "updatedAt")
           VALUES ($1, $1, 'Test Map', 'testing', $2, now())""",
        map_id,
        uid,
    )
    node_id = f"node-{uuid.uuid4().hex[:12]}"
    await pool.execute(
        """INSERT INTO "Node" (id, "mapId", slug, title, "order", "updatedAt")
           VALUES ($1, $2, 'intro', 'Introduction', 0, now())""",
        node_id,
        map_id,
    )
    yield {"user": uid, "map": map_id, "node": node_id}
    await pool.execute('DELETE FROM "GenerationJob" WHERE "userId" = $1', uid)
    await pool.execute('DELETE FROM "Map" WHERE id = $1', map_id)
    await pool.execute('DELETE FROM "Quota" WHERE "userId" = $1', uid)
    await pool.execute('DELETE FROM "User" WHERE id = $1', uid)


async def test_quota_consume_and_exceed(pool, fixture_ids):
    uid = fixture_ids["user"]
    # cap the limit to 2 by pre-inserting a row near the limit
    await consume(pool, uid, "sections_per_day")
    await pool.execute(
        'UPDATE "Quota" SET used = "limit" WHERE "userId" = $1 AND kind = $2',
        uid,
        "sections_per_day",
    )
    with pytest.raises(QuotaExceeded):
        await consume(pool, uid, "sections_per_day")


async def test_quota_concurrent_never_overspends(pool, fixture_ids):
    uid = fixture_ids["user"]
    limit = 30

    async def one():
        try:
            await consume(pool, uid, "sections_per_day")
            return 1
        except QuotaExceeded:
            return 0

    results = await asyncio.gather(*[one() for _ in range(limit + 10)])
    assert sum(results) == limit
    row = await pool.fetchrow(
        'SELECT used FROM "Quota" WHERE "userId" = $1 AND kind = $2', uid, "sections_per_day"
    )
    assert row["used"] == limit


async def test_quota_resets_after_window(pool, fixture_ids):
    uid = fixture_ids["user"]
    await consume(pool, uid, "sections_per_day")
    await pool.execute(
        """UPDATE "Quota" SET used = "limit", "resetsAt" = now() - interval '1 minute'
           WHERE "userId" = $1 AND kind = $2""",
        uid,
        "sections_per_day",
    )
    await consume(pool, uid, "sections_per_day")  # window expired → allowed again
    row = await pool.fetchrow(
        'SELECT used FROM "Quota" WHERE "userId" = $1 AND kind = $2', uid, "sections_per_day"
    )
    assert row["used"] == 1


async def test_section_job_end_to_end(pool, fixture_ids, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    await pool.execute("DELETE FROM \"GenerationJob\" WHERE kind LIKE 'test%' OR kind = 'section'")
    jid = f"job-{uuid.uuid4().hex[:12]}"
    await pool.execute(
        """INSERT INTO "GenerationJob" (id, kind, "userId", "mapId", "nodeId", payload, "updatedAt")
           VALUES ($1, 'section', $2, $3, $4, $5, now() - interval '5 seconds')""",
        jid,
        fixture_ids["user"],
        fixture_ids["map"],
        fixture_ids["node"],
        json.dumps(
            {
                "mapId": fixture_ids["map"],
                "nodeId": fixture_ids["node"],
                "topic": "testing",
                "nodeTitle": "Introduction",
                "nodeSlug": "intro",
                "mapVersion": 1,
            }
        ),
    )
    register_handler("section", handle_section)
    job = await claim_job(pool, "w-sec")
    assert job is not None and job["id"] == jid
    await run_job(pool, job, "w-sec")

    row = await pool.fetchrow('SELECT * FROM "GenerationJob" WHERE id = $1', jid)
    assert row["status"] == "succeeded", row["error"]
    steps = [c["step"] for c in json.loads(row["checkpoints"])]
    assert steps == ["section_requested", "text_generated", "block_created", "done"]

    block = await pool.fetchrow(
        'SELECT * FROM "ContentBlock" WHERE "nodeId" = $1', fixture_ids["node"]
    )
    assert block["type"] == "ai_text"
    assert block["provenanceModel"] == "mock-model"
    assert block["body"]

    quota = await pool.fetchrow(
        'SELECT used FROM "Quota" WHERE "userId" = $1 AND kind = $2',
        fixture_ids["user"],
        "sections_per_day",
    )
    assert quota["used"] == 1
