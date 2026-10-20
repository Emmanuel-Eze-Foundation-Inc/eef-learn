"""Persist mixed beats (watch / read / idea / check) onto a node."""

from __future__ import annotations

import json
import uuid
from typing import Any

import asyncpg

from eef_ai.sources import canonical_youtube, http_url_ok, youtube_id, youtube_oembed_title

BLOCK_TYPES = {
    "youtube",
    "blog",
    "ai_text",
    "flashcard",
    "quiz",
    "video",
    "image",
    "audio",
    "embed",
    "code",
    "resource",
    "pdf_extract",
}
URL_TYPES = {"video", "image", "audio", "embed", "resource"}


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def _quiz_ok(body: str) -> bool:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return False
    options = data.get("options") if isinstance(data, dict) else None
    correct = data.get("correct") if isinstance(data, dict) else None
    prompt = data.get("prompt") if isinstance(data, dict) else None
    return (
        isinstance(prompt, str)
        and isinstance(options, list)
        and len(options) >= 2
        and isinstance(correct, list)
        and len(correct) >= 1
    )


def _code_ok(body: str) -> bool:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return bool(body.strip())
    return isinstance(data, dict) and isinstance(data.get("code"), str) and bool(data["code"].strip())


def _flash_ok(body: str) -> bool:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return False
    return isinstance(data, dict) and isinstance(data.get("front"), str) and isinstance(data.get("back"), str)


async def normalize_beat(raw: dict[str, Any], *, verify: bool = True) -> dict[str, Any] | None:
    kind = str(raw.get("type") or "")
    if kind not in BLOCK_TYPES:
        return None
    title = str(raw.get("title") or "").strip() or None
    body = raw.get("body")
    if body is not None and not isinstance(body, str):
        body = json.dumps(body)
    url = raw.get("url")
    url = url.strip() if isinstance(url, str) else None
    source_name = str(raw.get("sourceName") or raw.get("source") or "").strip() or "Course create"
    source_url = url

    if kind == "youtube":
        if not url or not youtube_id(url):
            return None
        url = canonical_youtube(url)
        if verify:
            oembed_title = await youtube_oembed_title(url or "")
            if not oembed_title:
                return None
            title = title or oembed_title
            source_name = oembed_title
        source_url = url
    elif kind == "blog":
        if not url or (verify and not http_url_ok(url)):
            return None
        source_url = url
    elif kind == "quiz":
        if not isinstance(body, str) or not _quiz_ok(body):
            return None
    elif kind == "flashcard":
        if not isinstance(body, str) or not _flash_ok(body):
            return None
    elif kind == "ai_text":
        if not isinstance(body, str) or len(body.strip()) < 40:
            return None
    elif kind in URL_TYPES:
        if not url or not url.startswith("https://") or (verify and not http_url_ok(url)):
            return None
        source_url = url
    elif kind == "code":
        if not isinstance(body, str) or not _code_ok(body):
            return None
    elif kind == "pdf_extract":
        if not (isinstance(body, str) and body.strip()) and not url:
            return None

    return {
        "type": kind,
        "title": title,
        "body": body,
        "url": url,
        "sourceName": source_name,
        "sourceUrl": source_url,
        "sourceType": "youtube" if kind == "youtube" else "blog",
    }


async def insert_beats(conn: asyncpg.Connection, node_id: str, map_version: int, beats: list[dict[str, Any]]) -> int:
    written = 0
    for beat in beats:
        block_id = _id("block")
        await conn.execute(
            """
            INSERT INTO "ContentBlock"
                (id, "nodeId", "blockIndex", type, title, body, url,
                 "provenanceModel", "mapVersion", "updatedAt")
            VALUES ($1, $2, $3, $4::"BlockType", $5, $6, $7, $8, $9, now())
            """,
            block_id,
            node_id,
            written,
            beat["type"],
            beat.get("title"),
            beat.get("body"),
            beat.get("url"),
            beat.get("provenanceModel"),
            map_version,
        )
        await conn.execute(
            """
            INSERT INTO "Attribution"
                (id, "contentBlockId", "sourceType", "sourceName", "sourceUrl", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, now())
            """,
            _id("attr"),
            block_id,
            beat.get("sourceType") or "blog",
            beat.get("sourceName") or "Course create",
            beat.get("sourceUrl"),
        )
        written += 1
    return written
