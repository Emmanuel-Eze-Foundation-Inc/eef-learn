"""Lightweight tool-calling agent for course-create (design D11 — no LangGraph)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

from eef_ai.pipelines.beats import normalize_beat
from eef_ai.providers.chat import ChatModelProvider, UserModel
from eef_ai.settings import Settings
from eef_ai.sources import search_youtube
from eef_ai.worker import JobContext

SKILL = (Path(__file__).with_name("skill.md")).read_text()
MAX_STEPS = 40

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the open web for how this topic is taught.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_youtube",
            "description": "Search YouTube for embeddable explainers. Returns verified watch URLs.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "verify_source",
            "description": "Confirm a YouTube or https URL is real before add_beat.",
            "parameters": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_module",
            "description": "Add one lesson node. Call several times before filling beats.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string"},
                    "title": {"type": "string"},
                    "order": {"type": "integer"},
                    "parent": {"type": "string", "description": "Parent slug, or empty for a root"},
                },
                "required": ["slug", "title", "order"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_prerequisite",
            "description": "Mark that `to` should come after `from`.",
            "parameters": {
                "type": "object",
                "properties": {"from_slug": {"type": "string"}, "to_slug": {"type": "string"}},
                "required": ["from_slug", "to_slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_beat",
            "description": "Add a typed beat to a module: youtube, blog, ai_text, quiz, or flashcard.",
            "parameters": {
                "type": "object",
                "properties": {
                    "node_slug": {"type": "string"},
                    "type": {"type": "string", "enum": ["youtube", "blog", "ai_text", "quiz", "flashcard"]},
                    "title": {"type": "string"},
                    "body": {"type": "string"},
                    "url": {"type": "string"},
                    "sourceName": {"type": "string"},
                },
                "required": ["node_slug", "type", "title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finish_map",
            "description": "End the run after modules and beats are in place.",
            "parameters": {
                "type": "object",
                "properties": {"summary": {"type": "string"}},
                "required": ["summary"],
            },
        },
    },
]


@dataclass
class CourseState:
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)
    beats: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    finished: bool = False
    summary: str = ""


def _args(call: dict[str, Any]) -> dict[str, Any]:
    raw = call.get("function", {}).get("arguments") or "{}"
    if isinstance(raw, dict):
        return raw
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


async def _search_web(query: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
            )
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return json.dumps({"ok": False, "error": "search failed"})
    related: list[str] = []
    for item in data.get("RelatedTopics") or []:
        if isinstance(item, dict) and item.get("Text"):
            related.append(str(item["Text"])[:240])
        if len(related) >= 6:
            break
    return json.dumps(
        {
            "abstract": data.get("Abstract") or data.get("AbstractText") or "",
            "heading": data.get("Heading") or "",
            "related": related,
        }
    )


async def _dispatch(
    name: str,
    args: dict[str, Any],
    state: CourseState,
    settings: Settings,
) -> str:
    if name == "search_web":
        return await _search_web(str(args.get("query") or ""))
    if name == "search_youtube":
        hits = await search_youtube(str(args.get("query") or ""), settings.youtube_api_key)
        return json.dumps({"hits": hits, "note": "empty if YOUTUBE_API_KEY is unset — use verify_source on URLs you found"})
    if name == "verify_source":
        beat = await normalize_beat(
            {"type": "youtube", "url": args.get("url"), "title": "check", "body": "x" * 40},
            verify=True,
        )
        if beat:
            return json.dumps({"ok": True, "url": beat.get("url"), "title": beat.get("title")})
        blog = await normalize_beat(
            {
                "type": "blog",
                "url": args.get("url"),
                "title": "check",
                "body": "Verified source card for this module.",
            },
            verify=True,
        )
        if blog:
            return json.dumps({"ok": True, "url": blog.get("url"), "kind": "blog"})
        return json.dumps({"ok": False, "error": "url did not verify"})
    if name == "add_module":
        slug = str(args.get("slug") or "").strip()
        title = str(args.get("title") or "").strip()
        if not slug or not title:
            return json.dumps({"ok": False, "error": "slug and title required"})
        parent = args.get("parent") or None
        if parent == "":
            parent = None
        order = args.get("order")
        if not isinstance(order, int):
            order = len(state.nodes)
        state.nodes = [n for n in state.nodes if n["slug"] != slug]
        state.nodes.append({"slug": slug, "title": title, "order": order, "parent": parent})
        state.beats.setdefault(slug, [])
        return json.dumps({"ok": True, "modules": len(state.nodes)})
    if name == "add_prerequisite":
        a, b = str(args.get("from_slug") or ""), str(args.get("to_slug") or "")
        if not a or not b:
            return json.dumps({"ok": False, "error": "both slugs required"})
        state.edges.append({"from": a, "to": b, "kind": "prerequisite"})
        return json.dumps({"ok": True, "edges": len(state.edges)})
    if name == "add_beat":
        slug = str(args.get("node_slug") or "")
        if slug not in {n["slug"] for n in state.nodes}:
            return json.dumps({"ok": False, "error": "unknown module slug — add_module first"})
        body = args.get("body")
        if isinstance(body, dict):
            body = json.dumps(body)
        beat = await normalize_beat(
            {
                "type": args.get("type"),
                "title": args.get("title"),
                "body": body,
                "url": args.get("url"),
                "sourceName": args.get("sourceName"),
            },
            verify=True,
        )
        if not beat:
            return json.dumps({"ok": False, "error": "beat failed validation (bad quiz JSON or unverified URL)"})
        state.beats.setdefault(slug, []).append(beat)
        return json.dumps({"ok": True, "beats": len(state.beats[slug])})
    if name == "finish_map":
        state.finished = True
        state.summary = str(args.get("summary") or "")
        return json.dumps({"ok": True, "modules": len(state.nodes), "summary": state.summary})
    return json.dumps({"ok": False, "error": f"unknown tool {name}"})


async def run_course_agent(
    ctx: JobContext,
    settings: Settings,
    *,
    topic: str,
    brief: dict[str, Any] | None,
    user: UserModel,
) -> CourseState:
    provider = ChatModelProvider(settings, user)
    model = provider.model_for("skeleton")
    brief_txt = ""
    if brief:
        brief_txt = "\n".join(f"- {k}: {v}" for k, v in brief.items() if v)
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SKILL},
        {
            "role": "user",
            "content": f"Build a learning map for: {topic}\nBrief:\n{brief_txt or '- (none)'}\nUse tools. Modules first, then fill each one. finish_map when done.",
        },
    ]
    state = CourseState()
    await ctx.checkpoint("researching", topic=topic)

    for step in range(MAX_STEPS):
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",
            "max_tokens": 4000,
        }
        if provider.web_search:
            try:
                data = await provider._post("/chat/completions", {**payload, "plugins": [{"id": "web", "max_results": 3}]})
            except httpx.HTTPStatusError:
                data = await provider._post("/chat/completions", payload)
        else:
            data = await provider._post("/chat/completions", payload)
        choice = (data.get("choices") or [{}])[0].get("message") or {}
        messages.append(choice)
        calls = choice.get("tool_calls") or []
        if not calls:
            if state.finished:
                break
            messages.append(
                {
                    "role": "user",
                    "content": "Continue with tools. add_module / add_beat / finish_map. Do not reply in prose only.",
                }
            )
            continue
        for call in calls:
            name = (call.get("function") or {}).get("name") or ""
            await ctx.checkpoint(f"agent:{step}:{name}:{call.get('id', step)}", tool=name)
            result = await _dispatch(name, _args(call), state, settings)
            messages.append({"role": "tool", "tool_call_id": call.get("id"), "content": result})
        if state.finished:
            break

    if len(state.nodes) < 2:
        raise ValueError("agent finished without enough modules")
    return state
