"""Skeleton pipeline tests (T5): graph validation (pure) + end-to-end persist (DB-backed)."""

import json
import os
import uuid

import asyncpg
import pytest

from eef_ai.graph import validate_skeleton
from eef_ai.pipelines.skeleton import handle_skeleton
from eef_ai.worker import claim_job, run_job

TEST_DB = os.environ.get("TEST_DATABASE_URL")


# --- pure validation tests (always run) ---


def valid_skeleton():
    return {
        "nodes": [
            {"slug": "a", "title": "A", "order": 0},
            {"slug": "b", "title": "B", "order": 1},
            {"slug": "c", "title": "C", "order": 2},
        ],
        "edges": [{"from": "a", "to": "b"}, {"from": "b", "to": "c"}],
    }


def test_valid_skeleton_passes():
    assert validate_skeleton(valid_skeleton()) == []


def test_rejects_duplicate_slugs():
    s = valid_skeleton()
    s["nodes"][1]["slug"] = "a"
    assert any("duplicate" in e for e in validate_skeleton(s))


def test_rejects_unknown_edge_refs():
    s = valid_skeleton()
    s["edges"].append({"from": "a", "to": "zzz"})
    assert any("unknown node" in e for e in validate_skeleton(s))


def test_rejects_cycle():
    s = valid_skeleton()
    s["edges"].append({"from": "c", "to": "a"})
    assert any("cycle" in e for e in validate_skeleton(s))


def test_rejects_self_loop():
    s = valid_skeleton()
    s["edges"].append({"from": "a", "to": "a"})
    assert any("self-loop" in e for e in validate_skeleton(s))


def test_rejects_too_small():
    assert validate_skeleton({"nodes": [{"slug": "a", "title": "A", "order": 0}]})


def test_accepts_nested_parent():
    s = valid_skeleton()
    s["nodes"].append({"slug": "b-child", "title": "B child", "order": 0, "parent": "b"})
    assert validate_skeleton(s) == []


def test_rejects_unknown_parent():
    s = valid_skeleton()
    s["nodes"][1]["parent"] = "ghost"
    assert any("parent is missing" in e for e in validate_skeleton(s))


# --- end-to-end pipeline test (DB-backed) ---


@pytest.mark.skipif(not TEST_DB, reason="TEST_DATABASE_URL not set")
async def test_skeleton_job_end_to_end(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    pool = await asyncpg.create_pool(TEST_DB, min_size=1, max_size=3)
    try:
        uid = f"test-{uuid.uuid4().hex[:12]}"
        await pool.execute(
            """INSERT INTO "User" (id, email, name, birthdate, "updatedAt")
               VALUES ($1, $2, 'Skeleton Test', '1990-01-01', now())""",
            uid,
            f"{uid}@test.local",
        )
        map_id = f"map-{uuid.uuid4().hex[:12]}"
        await pool.execute(
            """INSERT INTO "Map" (id, slug, title, topic, "creatorId", "updatedAt")
               VALUES ($1, $1, 'Rust', 'rust programming', $2, now())""",
            map_id,
            uid,
        )
        jid = f"job-{uuid.uuid4().hex[:12]}"
        await pool.execute(
            """INSERT INTO "GenerationJob" (id, kind, "userId", "mapId", payload, "updatedAt")
               VALUES ($1, 'skeleton', $2, $3, $4, now() - interval '5 seconds')""",
            jid,
            uid,
            map_id,
            json.dumps({"topic": "rust programming", "mapId": map_id}),
        )

        from eef_ai.worker import register_handler

        register_handler("skeleton", handle_skeleton)
        job = await claim_job(pool, "w-skel")
        assert job is not None and job["id"] == jid
        await run_job(pool, job, "w-skel")

        row = await pool.fetchrow('SELECT * FROM "GenerationJob" WHERE id = $1', jid)
        assert row["status"] == "succeeded", row["error"]
        steps = [c["step"] for c in json.loads(row["checkpoints"])]
        assert steps == ["skeleton_requested", "skeleton_generated", "nodes_created", "done"]

        nodes = await pool.fetch('SELECT * FROM "Node" WHERE "mapId" = $1 ORDER BY "order"', map_id)
        edges = await pool.fetch('SELECT * FROM "Edge" WHERE "mapId" = $1', map_id)
        assert len(nodes) == 6  # mock provider emits a nested tree
        assert len(edges) == 3
        assert any(n["parentId"] for n in nodes)
        node_ids = {n["id"] for n in nodes}
        assert all(e["fromId"] in node_ids and e["toId"] in node_ids for e in edges)

        # cleanup
        await pool.execute('DELETE FROM "GenerationJob" WHERE id = $1', jid)
        await pool.execute('DELETE FROM "Map" WHERE id = $1', map_id)
        await pool.execute('DELETE FROM "User" WHERE id = $1', uid)
    finally:
        await pool.close()
