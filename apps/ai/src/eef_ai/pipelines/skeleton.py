"""Skeleton pipeline (ticket T5): topic → validated DAG → Map nodes/edges + checkpoints.

On the creator's own model, a tool-calling agent (design D11) researches, adds modules,
then fills beats. Without one, only mock mode (deterministic, for CI) builds anything.
"""

import uuid
from typing import Any

from eef_ai.agent.course import run_course_agent
from eef_ai.graph import validate_skeleton
from eef_ai.pipelines.beats import insert_beats, normalize_beat
from eef_ai.providers.base import MockProvider, get_provider
from eef_ai.providers.chat import ChatModelProvider, NoUserModel, job_user_model
from eef_ai.settings import load_settings
from eef_ai.worker import JobContext, PermanentJobError, register_handler


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


LAYOUT_COL = 300.0
LAYOUT_ROW = 104.0
LAYOUT_INDENT = 20.0


def _layout_positions(nodes: list[dict[str, Any]]) -> dict[str, tuple[float, float]]:
    """Match packages/core layoutTree: modules as columns, lessons stacked under each."""
    by_parent: dict[str | None, list[dict[str, Any]]] = {}
    for n in nodes:
        parent = n.get("parent") or None
        by_parent.setdefault(parent, []).append(n)
    for group in by_parent.values():
        group.sort(key=lambda row: (row.get("order") or 0, row.get("slug") or ""))

    def descendants(slug: str, depth: int) -> list[tuple[str, int]]:
        out: list[tuple[str, int]] = []
        for child in by_parent.get(slug, []):
            out.append((child["slug"], depth))
            out.extend(descendants(child["slug"], depth + 1))
        return out

    roots = by_parent.get(None, [])
    intro = roots[0]["slug"] if len(roots) == 1 and by_parent.get(roots[0]["slug"]) else None
    modules = by_parent.get(intro, []) if intro else roots
    top = LAYOUT_ROW * 1.5 if intro else 0.0
    pos: dict[str, tuple[float, float]] = {}
    if intro:
        pos[intro] = ((len(modules) - 1) * LAYOUT_COL / 2, 0.0)
    for i, head in enumerate(modules):
        x = i * LAYOUT_COL
        pos[head["slug"]] = (x, top)
        for j, (slug, depth) in enumerate(descendants(head["slug"], 0)):
            pos[slug] = (x + depth * LAYOUT_INDENT, top + LAYOUT_ROW * (1.4 + j))
    return pos


async def persist_graph(
    ctx: JobContext,
    map_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> dict[str, str]:
    nodes = sorted(nodes, key=lambda n: n.get("order") or 0)
    laid = _layout_positions(nodes)
    async with ctx.pool.acquire() as conn, conn.transaction():
        await conn.execute('DELETE FROM "Node" WHERE "mapId" = $1', map_id)
        node_ids: dict[str, str] = {}
        for n in nodes:
            nid = _id("node")
            node_ids[n["slug"]] = nid
            x, y = laid.get(n["slug"], (120.0, 80.0))
            await conn.execute(
                """
                INSERT INTO "Node" (id, "mapId", slug, title, "order", "parentId", "positionX", "positionY", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, now())
                """,
                nid,
                map_id,
                n["slug"],
                n["title"],
                n["order"],
                x,
                y,
            )
        for n in nodes:
            parent_slug = n.get("parent") or None
            if not parent_slug:
                continue
            parent_id = node_ids.get(parent_slug)
            if not parent_id:
                continue
            await conn.execute(
                'UPDATE "Node" SET "parentId" = $1, "updatedAt" = now() WHERE id = $2',
                parent_id,
                node_ids[n["slug"]],
            )
        for e in edges:
            from_id = node_ids.get(e.get("from") or "")
            to_id = node_ids.get(e.get("to") or "")
            if not from_id or not to_id:
                continue
            await conn.execute(
                """
                INSERT INTO "Edge" (id, "mapId", "fromId", "toId", kind, "updatedAt")
                VALUES ($1, $2, $3, $4, $5, now())
                """,
                _id("edge"),
                map_id,
                from_id,
                to_id,
                e.get("kind", "prerequisite"),
            )
        await conn.execute('UPDATE "Map" SET "updatedAt" = now() WHERE id = $1', map_id)
    return node_ids


async def _fill_mock(
    ctx: JobContext,
    provider: MockProvider,
    *,
    topic: str,
    nodes: list[dict[str, Any]],
    node_ids: dict[str, str],
    map_version: int,
) -> None:
    await ctx.checkpoint("researching", topic=topic)
    for n in nodes:
        slug = n["slug"]
        title = n["title"]
        await ctx.checkpoint(f"filling_module:{slug}", title=title)
        raw_beats = await provider.module_beats(topic=topic, node_slug=slug, node_title=title)
        prepared: list[dict[str, Any]] = []
        for raw in raw_beats:
            beat = await normalize_beat(raw, verify=False)
            if beat:
                beat["provenanceModel"] = "mock-model"
                prepared.append(beat)
        if prepared:
            async with ctx.pool.acquire() as conn:
                await insert_beats(conn, node_ids[slug], map_version, prepared)
    await ctx.checkpoint("beats_created")


async def handle_skeleton(ctx: JobContext) -> dict[str, Any]:
    settings = load_settings()
    user = job_user_model(ctx.payload.get("userModel"), settings)
    try:
        provider = get_provider(settings, user)
    except NoUserModel as exc:
        raise PermanentJobError(str(exc)) from None
    topic: str = ctx.payload["topic"]
    map_id: str = ctx.payload["mapId"]
    brief = ctx.payload.get("brief") if isinstance(ctx.payload.get("brief"), dict) else None

    await ctx.checkpoint("skeleton_requested", topic=topic)

    if user:
        state = await run_course_agent(ctx, settings, topic=topic, brief=brief, user=user)
        skeleton = {"nodes": state.nodes, "edges": state.edges}
        problems = validate_skeleton(skeleton)
        if problems:
            raise ValueError(f"invalid skeleton from agent: {'; '.join(problems)}")
        await ctx.checkpoint("skeleton_generated", node_count=len(state.nodes))
        node_ids = await persist_graph(ctx, map_id, state.nodes, state.edges)
        await ctx.checkpoint(
            "nodes_created",
            map_id=map_id,
            nodes=[{"slug": n["slug"], "title": n["title"], "parent": n.get("parent")} for n in state.nodes],
        )
        map_row = await ctx.pool.fetchrow('SELECT version FROM "Map" WHERE id = $1', map_id)
        map_version = int(map_row["version"]) if map_row else 1
        model = ChatModelProvider(settings, user).model_for("section")
        for slug, beats in state.beats.items():
            node_id = node_ids.get(slug)
            if not node_id or not beats:
                continue
            for beat in beats:
                beat["provenanceModel"] = model
            async with ctx.pool.acquire() as conn:
                await insert_beats(conn, node_id, map_version, beats)
        await ctx.checkpoint("beats_created")
        await ctx.checkpoint("done")
        return {"cost_cents": 0}

    skeleton = await provider.map_skeleton(topic, brief)
    problems = validate_skeleton(skeleton)
    if problems:
        raise ValueError(f"invalid skeleton from provider: {'; '.join(problems)}")
    await ctx.checkpoint("skeleton_generated", node_count=len(skeleton["nodes"]))
    nodes: list[dict[str, Any]] = sorted(skeleton["nodes"], key=lambda n: n["order"])
    node_ids = await persist_graph(ctx, map_id, nodes, skeleton.get("edges", []))
    await ctx.checkpoint(
        "nodes_created",
        map_id=map_id,
        nodes=[{"slug": n["slug"], "title": n["title"], "parent": n.get("parent") or None} for n in nodes],
    )
    map_row = await ctx.pool.fetchrow('SELECT version FROM "Map" WHERE id = $1', map_id)
    map_version = int(map_row["version"]) if map_row else 1
    assert isinstance(provider, MockProvider)
    await _fill_mock(ctx, provider, topic=topic, nodes=nodes, node_ids=node_ids, map_version=map_version)
    await ctx.checkpoint("done")
    return {"cost_cents": 0}


register_handler("skeleton", handle_skeleton)
