"""Section pipeline (ticket T6): node → ai_text ContentBlock with provenance.

Contract with web (T10):
- payload: {"mapId", "nodeId", "topic", "nodeTitle", "nodeSlug", "mapVersion"}
- consumes 1 unit of sections_per_day (atomic; quota failure is permanent, no retry)
- idempotent: the (nodeId, blockIndex, mapVersion) unique key + ON CONFLICT
  makes a retried job converge on the same block
- checkpoints: section_requested → text_generated → block_created → done
"""

import uuid
from typing import Any

from eef_ai.providers.base import get_provider
from eef_ai.quota import QuotaExceeded, consume
from eef_ai.settings import load_settings
from eef_ai.worker import JobContext, PermanentJobError, register_handler


async def handle_section(ctx: JobContext) -> dict[str, Any]:
    settings = load_settings()
    p = ctx.payload
    provider = get_provider(settings, p.get("userApiKey"))
    node_id: str = p["nodeId"]
    map_version: int = p.get("mapVersion", 1)
    user_id: str = ctx.job["userId"]

    try:
        await consume(ctx.pool, user_id, "sections_per_day")
    except QuotaExceeded as e:
        raise PermanentJobError(str(e)) from None

    await ctx.checkpoint("section_requested", node_id=node_id)

    section = await provider.section_text(
        topic=p.get("topic", ""),
        node_slug=p.get("nodeSlug", ""),
        node_title=p.get("nodeTitle", ""),
    )
    await ctx.checkpoint("text_generated")

    prov = section.get("provenance", {})
    block_id = f"block_{uuid.uuid4().hex}"
    row = await ctx.pool.fetchrow(
        """
        INSERT INTO "ContentBlock"
            (id, "nodeId", "blockIndex", type, title, body,
             "provenanceModel", "provenancePromptHash", "mapVersion", "updatedAt")
        SELECT $1, $2,
               COALESCE(MAX("blockIndex") + 1, 0), 'ai_text'::"BlockType", $3, $4, $5, $6, $7, now()
        FROM "ContentBlock" WHERE "nodeId" = $2 AND "mapVersion" = $7
        ON CONFLICT ("nodeId", "blockIndex", "mapVersion") DO NOTHING
        RETURNING id, "blockIndex"
        """,
        block_id,
        node_id,
        section.get("title"),
        section.get("body", ""),
        prov.get("model"),
        prov.get("prompt_hash"),
        map_version,
    )
    if row is None:
        # concurrent insert raced us; the content exists — converge, don't duplicate
        row = await ctx.pool.fetchrow(
            """SELECT id, "blockIndex" FROM "ContentBlock"
               WHERE "nodeId" = $1 AND "mapVersion" = $2
               ORDER BY "blockIndex" DESC LIMIT 1""",
            node_id,
            map_version,
        )

    await ctx.checkpoint("block_created", block_id=row["id"], block_index=row["blockIndex"])
    await ctx.checkpoint("done")
    return {"cost_cents": 0}


register_handler("section", handle_section)
