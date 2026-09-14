"""Skeleton pipeline (ticket T5): topic → validated DAG → Map nodes/edges + checkpoints.

Contract with web (T7):
- web pre-creates the Map row (so slug/ID are known instantly) and enqueues a
  GenerationJob kind="skeleton" with payload {"topic": ..., "mapId": ...}
- pipeline fills nodes/edges atomically and reports progress via checkpoints:
  skeleton_requested → skeleton_generated → nodes_created → done
- retries are safe: nodes are inserted in one transaction; a retry after a
  partial failure clears and rebuilds this map's nodes (map is not yet visible)
"""

import uuid
from typing import Any

from eef_ai.graph import validate_skeleton
from eef_ai.providers.base import get_provider
from eef_ai.settings import load_settings
from eef_ai.worker import JobContext, register_handler


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


async def handle_skeleton(ctx: JobContext) -> dict[str, Any]:
    settings = load_settings()
    provider = get_provider(settings, ctx.payload.get("userApiKey"))
    topic: str = ctx.payload["topic"]
    map_id: str = ctx.payload["mapId"]
    brief = ctx.payload.get("brief") if isinstance(ctx.payload.get("brief"), dict) else None

    await ctx.checkpoint("skeleton_requested", topic=topic)

    skeleton = await provider.map_skeleton(topic, brief)
    problems = validate_skeleton(skeleton)
    if problems:
        raise ValueError(f"invalid skeleton from provider: {'; '.join(problems)}")
    await ctx.checkpoint("skeleton_generated", node_count=len(skeleton["nodes"]))

    nodes: list[dict[str, Any]] = sorted(skeleton["nodes"], key=lambda n: n["order"])
    edges: list[dict[str, Any]] = skeleton.get("edges", [])

    async with ctx.pool.acquire() as conn, conn.transaction():
        # retry-safe: clear any partial state for this not-yet-visible map
        await conn.execute('DELETE FROM "Node" WHERE "mapId" = $1', map_id)
        node_ids: dict[str, str] = {}
        for n in nodes:
            nid = _id("node")
            node_ids[n["slug"]] = nid
            await conn.execute(
                """
                INSERT INTO "Node" (id, "mapId", slug, title, "order", "parentId", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, NULL, now())
                """,
                nid,
                map_id,
                n["slug"],
                n["title"],
                n["order"],
            )
        for n in nodes:
            parent_slug = n.get("parent") or None
            if not parent_slug:
                continue
            await conn.execute(
                'UPDATE "Node" SET "parentId" = $1, "updatedAt" = now() WHERE id = $2',
                node_ids[parent_slug],
                node_ids[n["slug"]],
            )
        for e in edges:
            await conn.execute(
                """
                INSERT INTO "Edge" (id, "mapId", "fromId", "toId", kind, "updatedAt")
                VALUES ($1, $2, $3, $4, $5, now())
                """,
                _id("edge"),
                map_id,
                node_ids[e["from"]],
                node_ids[e["to"]],
                e.get("kind", "prerequisite"),
            )
        await conn.execute('UPDATE "Map" SET "updatedAt" = now() WHERE id = $1', map_id)

    await ctx.checkpoint(
        "nodes_created",
        map_id=map_id,
        nodes=[
            {"slug": n["slug"], "title": n["title"], "parent": n.get("parent") or None}
            for n in nodes
        ],
    )
    await ctx.checkpoint("done")
    return {"cost_cents": 0}


register_handler("skeleton", handle_skeleton)
