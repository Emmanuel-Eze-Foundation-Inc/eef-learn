"""GenerationJob worker (ticket T4).

Design (PLAN.md M2, eng review A1/A2):
- claim: single-UPDATE with FOR UPDATE SKIP LOCKED subselect — safe for N workers
- lease: heartbeatAt refreshed every HEARTBEAT_SECONDS while a job runs
- reaper: running jobs with a stale heartbeat return to queued (or fail at max attempts)
- backoff: a re-queued job is not claimable until 2^attempts seconds after its last touch
- checkpoints: append-only jsonb array the web client polls; idempotent via `step` keys

Handlers are registered per job kind; T5/T6 register skeleton/section pipelines.
"""

import asyncio
import json
import logging
import socket
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import asyncpg

logger = logging.getLogger("eef_ai.worker")

HEARTBEAT_SECONDS = 10
STALE_LEASE_SECONDS = 60
IDLE_POLL_SECONDS = 1.0
REAPER_INTERVAL_SECONDS = 15

Handler = Callable[["JobContext"], Awaitable[dict[str, Any] | None]]
_handlers: dict[str, Handler] = {}


def register_handler(kind: str, handler: Handler) -> None:
    _handlers[kind] = handler


class JobContext:
    """Everything a pipeline needs: the job row, the pool, and checkpointing."""

    def __init__(self, pool: asyncpg.Pool, job: asyncpg.Record):
        self.pool = pool
        self.job = job
        self.job_id: str = job["id"]
        self.payload: dict[str, Any] = json.loads(job["payload"])

    async def checkpoint(self, step: str, **data: Any) -> None:
        """Append a checkpoint unless one with this step already exists (idempotent on retry)."""
        entry = json.dumps({"step": step, **data})
        await self.pool.execute(
            """
            UPDATE "GenerationJob"
            SET checkpoints = checkpoints || $2::jsonb, "updatedAt" = now()
            WHERE id = $1
              AND NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(checkpoints) c
                WHERE c->>'step' = $3
              )
            """,
            self.job_id,
            entry,
            step,
        )


async def claim_job(pool: asyncpg.Pool, worker_id: str) -> asyncpg.Record | None:
    """Atomically claim the oldest eligible queued job. Backoff: 2^attempts seconds."""
    return await pool.fetchrow(
        """
        UPDATE "GenerationJob"
        SET status = 'running'::"JobStatus",
            "claimedBy" = $1,
            "heartbeatAt" = now(),
            attempts = attempts + 1,
            "updatedAt" = now()
        WHERE id = (
            SELECT id FROM "GenerationJob"
            WHERE status = 'queued'::"JobStatus"
              AND "updatedAt" <= now() - make_interval(secs => least(300, power(2, attempts)) - 1)
            ORDER BY "createdAt"
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
        """,
        worker_id,
    )


async def complete_job(pool: asyncpg.Pool, job_id: str, actual_cost_cents: int = 0) -> None:
    await pool.execute(
        """
        UPDATE "GenerationJob"
        SET status = 'succeeded'::"JobStatus", "actualCostCents" = $2,
            error = NULL, "updatedAt" = now()
        WHERE id = $1
        """,
        job_id,
        actual_cost_cents,
    )


async def fail_job(pool: asyncpg.Pool, job_id: str, error: str) -> None:
    """Re-queue for retry, or fail permanently once attempts reach maxAttempts."""
    await pool.execute(
        """
        UPDATE "GenerationJob"
        SET status = CASE WHEN attempts >= "maxAttempts"
                          THEN 'failed'::"JobStatus" ELSE 'queued'::"JobStatus" END,
            error = $2, "claimedBy" = NULL, "heartbeatAt" = NULL, "updatedAt" = now()
        WHERE id = $1
        """,
        job_id,
        error[:2000],
    )


async def reap_stale(pool: asyncpg.Pool) -> int:
    """Return crashed workers' jobs to the queue (failed at max attempts)."""
    result = await pool.execute(
        f"""
        UPDATE "GenerationJob"
        SET status = CASE WHEN attempts >= "maxAttempts"
                          THEN 'failed'::"JobStatus" ELSE 'queued'::"JobStatus" END,
            error = COALESCE(error, 'worker lease expired'),
            "claimedBy" = NULL, "heartbeatAt" = NULL, "updatedAt" = now()
        WHERE status = 'running'::"JobStatus"
          AND "heartbeatAt" < now() - interval '{STALE_LEASE_SECONDS} seconds'
        """
    )
    return int(result.split()[-1])


async def _heartbeat_loop(pool: asyncpg.Pool, job_id: str, worker_id: str) -> None:
    while True:
        await asyncio.sleep(HEARTBEAT_SECONDS)
        await pool.execute(
            """
            UPDATE "GenerationJob" SET "heartbeatAt" = now()
            WHERE id = $1 AND "claimedBy" = $2 AND status = 'running'::"JobStatus"
            """,
            job_id,
            worker_id,
        )


async def run_job(pool: asyncpg.Pool, job: asyncpg.Record, worker_id: str) -> None:
    ctx = JobContext(pool, job)
    handler = _handlers.get(job["kind"])
    if handler is None:
        await fail_job(pool, ctx.job_id, f"no handler registered for kind={job['kind']}")
        return
    hb = asyncio.create_task(_heartbeat_loop(pool, ctx.job_id, worker_id))
    try:
        result = await handler(ctx)
        await complete_job(pool, ctx.job_id, (result or {}).get("cost_cents", 0))
    except Exception as e:
        logger.exception("job %s failed", ctx.job_id)
        await fail_job(pool, ctx.job_id, f"{type(e).__name__}: {e}")
    finally:
        hb.cancel()


async def worker_loop(pool: asyncpg.Pool, stop: asyncio.Event) -> None:
    """Main loop: claim → run → repeat; reap stale leases periodically."""
    worker_id = f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
    logger.info("worker %s started (handlers: %s)", worker_id, sorted(_handlers))
    last_reap = 0.0
    loop = asyncio.get_event_loop()
    while not stop.is_set():
        if loop.time() - last_reap > REAPER_INTERVAL_SECONDS:
            try:
                reaped = await reap_stale(pool)
                if reaped:
                    logger.warning("reaped %d stale jobs", reaped)
            except Exception:
                logger.exception("reaper error")
            last_reap = loop.time()
        try:
            job = await claim_job(pool, worker_id)
        except Exception:
            logger.exception("claim error; backing off")
            await asyncio.sleep(5)
            continue
        if job is None:
            try:
                await asyncio.wait_for(stop.wait(), timeout=IDLE_POLL_SECONDS)
            except TimeoutError:
                pass
            continue
        await run_job(pool, job, worker_id)
