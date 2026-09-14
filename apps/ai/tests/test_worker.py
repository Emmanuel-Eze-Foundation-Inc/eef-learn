"""Worker integration tests (ticket T4). Require TEST_DATABASE_URL; skipped otherwise.

Run locally:
  TEST_DATABASE_URL=postgresql://eef:eef@localhost:55432/eef_learn uv run pytest tests/test_worker.py
"""

import asyncio
import json
import os
import uuid

import asyncpg
import pytest

from eef_ai import worker
from eef_ai.worker import JobContext, claim_job, fail_job, reap_stale, run_job

TEST_DB = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(not TEST_DB, reason="TEST_DATABASE_URL not set")


@pytest.fixture
async def pool():
    p = await asyncpg.create_pool(TEST_DB, min_size=1, max_size=3)
    yield p
    await p.close()


@pytest.fixture
async def user_id(pool):
    # purge leftovers from prior interrupted runs so claim ordering is deterministic
    await pool.execute("DELETE FROM \"GenerationJob\" WHERE kind LIKE 'test%'")
    uid = f"test-{uuid.uuid4().hex[:12]}"
    await pool.execute(
        """
        INSERT INTO "User" (id, email, name, birthdate, "updatedAt")
        VALUES ($1, $2, 'Worker Test', '1990-01-01', now())
        """,
        uid,
        f"{uid}@test.local",
    )
    yield uid
    await pool.execute('DELETE FROM "GenerationJob" WHERE "userId" = $1', uid)
    await pool.execute('DELETE FROM "User" WHERE id = $1', uid)


async def make_job(pool, user_id: str, kind: str = "test", **payload) -> str:
    jid = f"job-{uuid.uuid4().hex[:12]}"
    await pool.execute(
        """
        INSERT INTO "GenerationJob" (id, kind, "userId", payload, "updatedAt")
        VALUES ($1, $2, $3, $4, now() - interval '5 seconds')
        """,
        jid,
        kind,
        user_id,
        json.dumps(payload),
    )
    return jid


async def test_claim_is_exclusive(pool, user_id):
    jid = await make_job(pool, user_id)
    a, b = await asyncio.gather(claim_job(pool, "w-a"), claim_job(pool, "w-b"))
    claimed = [r for r in (a, b) if r is not None and r["id"] == jid]
    assert len(claimed) == 1
    assert claimed[0]["status"] == "running"
    assert claimed[0]["attempts"] == 1


async def test_run_job_success_and_checkpoints(pool, user_id):
    async def handler(ctx: JobContext):
        await ctx.checkpoint("started", detail="one")
        await ctx.checkpoint("started", detail="duplicate-ignored")
        await ctx.checkpoint("done")
        return {"cost_cents": 7}

    worker.register_handler("test-ok", handler)
    jid = await make_job(pool, user_id, kind="test-ok")
    job = await claim_job(pool, "w-test")
    assert job is not None and job["id"] == jid
    await run_job(pool, job, "w-test")

    row = await pool.fetchrow('SELECT * FROM "GenerationJob" WHERE id = $1', jid)
    assert row["status"] == "succeeded"
    assert row["actualCostCents"] == 7
    steps = [c["step"] for c in json.loads(row["checkpoints"])]
    assert steps == ["started", "done"]  # duplicate step was idempotently ignored


async def test_failure_requeues_then_fails_at_max_attempts(pool, user_id):
    async def boom(ctx: JobContext):
        raise RuntimeError("pipeline exploded")

    worker.register_handler("test-boom", boom)
    jid = await make_job(pool, user_id, kind="test-boom")
    await pool.execute('UPDATE "GenerationJob" SET "maxAttempts" = 2 WHERE id = $1', jid)

    # attempt 1 → requeued
    job = await claim_job(pool, "w-test")
    await run_job(pool, job, "w-test")
    row = await pool.fetchrow('SELECT * FROM "GenerationJob" WHERE id = $1', jid)
    assert row["status"] == "queued"
    assert "pipeline exploded" in row["error"]

    # make claimable immediately (skip backoff), attempt 2 → failed
    await pool.execute(
        'UPDATE "GenerationJob" SET "updatedAt" = now() - interval \'1 hour\' WHERE id = $1', jid
    )
    job = await claim_job(pool, "w-test")
    await run_job(pool, job, "w-test")
    row = await pool.fetchrow('SELECT * FROM "GenerationJob" WHERE id = $1', jid)
    assert row["status"] == "failed"


async def test_backoff_blocks_immediate_reclaim(pool, user_id):
    jid = await make_job(pool, user_id, kind="test-backoff")
    job = await claim_job(pool, "w-test")
    assert job["id"] == jid
    await fail_job(pool, jid, "transient")
    # attempts=1 → not claimable for ~2s after updatedAt
    assert await claim_job(pool, "w-test") is None


async def test_reaper_recovers_stale_lease(pool, user_id):
    jid = await make_job(pool, user_id, kind="test-stale")
    await claim_job(pool, "w-crashed")
    await pool.execute(
        'UPDATE "GenerationJob" SET "heartbeatAt" = now() - interval \'10 minutes\' WHERE id = $1',
        jid,
    )
    assert await reap_stale(pool) >= 1
    row = await pool.fetchrow('SELECT status, "claimedBy" FROM "GenerationJob" WHERE id = $1', jid)
    assert row["status"] == "queued"
    assert row["claimedBy"] is None
