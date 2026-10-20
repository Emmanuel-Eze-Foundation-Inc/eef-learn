"""Interactive course editor agent: reads the live course, returns validated edit ops.

The web app owns persistence. This module only decides *what* to change and
validates every block before it leaves, so the web side can apply ops as-is.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from eef_ai.agent.course import _args, _search_web
from eef_ai.pipelines.beats import BLOCK_TYPES, normalize_beat
from eef_ai.providers.chat import ChatModelProvider, UserModel
from eef_ai.settings import Settings
from eef_ai.sources import search_youtube

SKILL = (Path(__file__).with_name("editor.md")).read_text()
MAX_STEPS = 24
BLOCK_ENUM = sorted(BLOCK_TYPES)


def _fn(
    name: str, description: str, properties: dict[str, Any], required: list[str]
) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": properties, "required": required},
        },
    }


S = {"type": "string"}

TOOLS: list[dict[str, Any]] = [
    _fn("search_web", "Search the open web for how this topic is taught.", {"query": S}, ["query"]),
    _fn("search_youtube", "Search YouTube for embeddable explainers.", {"query": S}, ["query"]),
    _fn(
        "verify_source",
        "Confirm a URL is real before adding a youtube/blog/video/resource block.",
        {"url": S},
        ["url"],
    ),
    _fn(
        "add_lesson",
        "Add a module (parent empty) or a lesson under a module (parent = module slug).",
        {"slug": S, "title": S, "parent": S},
        ["slug", "title"],
    ),
    _fn(
        "update_lesson",
        "Rename a lesson or move it under another parent ('' for top level).",
        {"slug": S, "title": S, "parent": S},
        ["slug"],
    ),
    _fn("remove_lesson", "Delete a lesson and its content.", {"slug": S}, ["slug"]),
    _fn(
        "add_block",
        "Add content to a lesson. body formats: ai_text = markdown; quiz = JSON "
        '{"prompt","mode":"radio|multi","options":[{"id","label"}],"correct":[ids]}; '
        'flashcard = JSON {"front","back"}; code = JSON {"language","code"}. '
        "youtube/video/audio/image/embed/blog/resource need an https url.",
        {
            "lesson_slug": S,
            "type": {"type": "string", "enum": BLOCK_ENUM},
            "title": S,
            "body": S,
            "url": S,
            "sourceName": S,
        },
        ["lesson_slug", "type"],
    ),
    _fn(
        "update_block",
        "Rewrite an existing block by id (from the course snapshot).",
        {"block_id": S, "title": S, "body": S, "url": S},
        ["block_id"],
    ),
    _fn("remove_block", "Delete a block by id.", {"block_id": S}, ["block_id"]),
    _fn(
        "add_prerequisite",
        "Mark that lesson `to_slug` builds on `from_slug` (it unlocks after it).",
        {"from_slug": S, "to_slug": S},
        ["from_slug", "to_slug"],
    ),
    _fn(
        "remove_prerequisite",
        "Remove a builds-on link.",
        {"from_slug": S, "to_slug": S},
        ["from_slug", "to_slug"],
    ),
    _fn(
        "reply",
        "Finish: tell the creator what you changed, in 1-3 sentences.",
        {"message": S},
        ["message"],
    ),
]


@dataclass
class EditState:
    slugs: set[str]
    block_ids: set[str]
    ops: list[dict[str, Any]] = field(default_factory=list)
    reply: str = ""
    done: bool = False


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "lesson"


def _unique_slug(state: EditState, wanted: str) -> str:
    base = _slugify(wanted)
    slug = base
    n = 2
    while slug in state.slugs:
        slug = f"{base}-{n}"
        n += 1
    return slug


def course_snapshot(course: dict[str, Any], focus: str | None) -> str:
    lines = [f"Course: {course.get('title')} (topic: {course.get('topic')})"]
    for node in course.get("nodes") or []:
        indent = "  " * int(node.get("depth") or 0)
        mark = "  <- FOCUS" if focus and node.get("slug") == focus else ""
        lines.append(f"{indent}- [{node['slug']}] {node['title']}{mark}")
        for block in node.get("blocks") or []:
            preview = (block.get("preview") or "").replace("\n", " ")[:90]
            lines.append(
                f"{indent}    · block {block['id']} {block['type']}: {block.get('title') or ''} {preview}"
            )
    edges = course.get("prerequisites") or []
    if edges:
        lines.append("Builds-on links: " + ", ".join(f"{e['from']}->{e['to']}" for e in edges))
    if not course.get("nodes"):
        lines.append("(empty — no lessons yet)")
    return "\n".join(lines)


async def _dispatch(
    name: str, args: dict[str, Any], state: EditState, settings: Settings, *, verify: bool
) -> str:
    if name == "search_web":
        return await _search_web(str(args.get("query") or ""))
    if name == "search_youtube":
        hits = await search_youtube(str(args.get("query") or ""), settings.youtube_api_key)
        return json.dumps({"hits": hits})
    if name == "verify_source":
        url = str(args.get("url") or "")
        for kind in ("youtube", "blog"):
            beat = await normalize_beat(
                {"type": kind, "url": url, "title": "check", "body": "x" * 40}, verify=True
            )
            if beat:
                return json.dumps(
                    {"ok": True, "url": beat.get("url"), "title": beat.get("title"), "kind": kind}
                )
        return json.dumps({"ok": False, "error": "url did not verify"})
    if name == "add_lesson":
        title = str(args.get("title") or "").strip()
        if not title:
            return json.dumps({"ok": False, "error": "title required"})
        parent = str(args.get("parent") or "").strip() or None
        if parent and parent not in state.slugs:
            return json.dumps({"ok": False, "error": f"unknown parent {parent}"})
        slug = _unique_slug(state, str(args.get("slug") or title))
        state.slugs.add(slug)
        state.ops.append({"op": "add_lesson", "slug": slug, "title": title, "parent": parent})
        return json.dumps({"ok": True, "slug": slug})
    if name == "update_lesson":
        slug = str(args.get("slug") or "")
        if slug not in state.slugs:
            return json.dumps({"ok": False, "error": "unknown slug"})
        op: dict[str, Any] = {"op": "update_lesson", "slug": slug}
        if args.get("title"):
            op["title"] = str(args["title"]).strip()
        if "parent" in args:
            parent = str(args.get("parent") or "").strip() or None
            if parent and parent not in state.slugs:
                return json.dumps({"ok": False, "error": "unknown parent"})
            op["parent"] = parent
        state.ops.append(op)
        return json.dumps({"ok": True})
    if name == "remove_lesson":
        slug = str(args.get("slug") or "")
        if slug not in state.slugs:
            return json.dumps({"ok": False, "error": "unknown slug"})
        state.slugs.discard(slug)
        state.ops.append({"op": "remove_lesson", "slug": slug})
        return json.dumps({"ok": True})
    if name == "add_block":
        slug = str(args.get("lesson_slug") or "")
        if slug not in state.slugs:
            return json.dumps({"ok": False, "error": "unknown lesson — add_lesson first"})
        beat = await normalize_beat(
            {
                "type": args.get("type"),
                "title": args.get("title"),
                "body": args.get("body"),
                "url": args.get("url"),
                "sourceName": args.get("sourceName"),
            },
            verify=verify,
        )
        if not beat:
            return json.dumps(
                {"ok": False, "error": "block failed validation (check body format or url)"}
            )
        state.ops.append({"op": "add_block", "lesson": slug, **beat})
        return json.dumps({"ok": True})
    if name == "update_block":
        block_id = str(args.get("block_id") or "")
        if block_id not in state.block_ids:
            return json.dumps({"ok": False, "error": "unknown block id"})
        patch = {k: args[k] for k in ("title", "body", "url") if isinstance(args.get(k), str)}
        state.ops.append({"op": "update_block", "id": block_id, **patch})
        return json.dumps({"ok": True})
    if name == "remove_block":
        block_id = str(args.get("block_id") or "")
        if block_id not in state.block_ids:
            return json.dumps({"ok": False, "error": "unknown block id"})
        state.block_ids.discard(block_id)
        state.ops.append({"op": "remove_block", "id": block_id})
        return json.dumps({"ok": True})
    if name in ("add_prerequisite", "remove_prerequisite"):
        a, b = str(args.get("from_slug") or ""), str(args.get("to_slug") or "")
        if a not in state.slugs or b not in state.slugs or a == b:
            return json.dumps({"ok": False, "error": "both slugs must exist and differ"})
        state.ops.append({"op": name, "from": a, "to": b})
        return json.dumps({"ok": True})
    if name == "reply":
        state.reply = str(args.get("message") or "").strip()
        state.done = True
        return json.dumps({"ok": True})
    return json.dumps({"ok": False, "error": f"unknown tool {name}"})


def _state_for(course: dict[str, Any]) -> EditState:
    nodes = course.get("nodes") or []
    return EditState(
        slugs={n["slug"] for n in nodes},
        block_ids={b["id"] for n in nodes for b in n.get("blocks") or []},
    )


async def run_editor(
    settings: Settings,
    *,
    course: dict[str, Any],
    message: str,
    focus: str | None,
    history: list[dict[str, str]],
    user: UserModel,
) -> dict[str, Any]:
    state = _state_for(course)
    provider = ChatModelProvider(settings, user)
    model = provider.model_for("skeleton")
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SKILL},
        {"role": "system", "content": "Current course:\n" + course_snapshot(course, focus)},
        *[
            {"role": m["role"], "content": m["content"]}
            for m in history[-8:]
            if m.get("role") in ("user", "assistant")
        ],
        {"role": "user", "content": message},
    ]

    for _ in range(MAX_STEPS):
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",
            "max_tokens": 4000,
        }
        data = await provider._post("/chat/completions", payload)
        choice = (data.get("choices") or [{}])[0].get("message") or {}
        messages.append(choice)
        calls = choice.get("tool_calls") or []
        if not calls:
            state.reply = state.reply or str(choice.get("content") or "").strip()
            break
        for call in calls:
            name = (call.get("function") or {}).get("name") or ""
            result = await _dispatch(name, _args(call), state, settings, verify=True)
            messages.append({"role": "tool", "tool_call_id": call.get("id"), "content": result})
        if state.done:
            break

    return {"reply": state.reply or "Done.", "ops": state.ops, "model": model}


# --- deterministic mock (AI_PROVIDER=mock, no key) ---------------------------------

_ABOUT = re.compile(r"(?:on|about|covering|for)\s+(.+?)(?:[.?!]|$)", re.IGNORECASE)


def _subject(message: str, fallback: str) -> str:
    match = _ABOUT.search(message)
    text = (match.group(1) if match else fallback).strip().strip("\"'")
    return text[:1].upper() + text[1:80] if text else fallback


def _reading(title: str, topic: str) -> str:
    return (
        f"## {title}\n\n"
        f"This lesson is a step in **{topic}**. Read it once for the shape, then again for the detail.\n\n"
        f"- What {title.lower()} is, in one sentence\n"
        f"- Where it shows up in real work\n"
        f"- The one mistake beginners make with it\n\n"
        f"> Mock agent text. Connect your own AI for researched, sourced lessons."
    )


def _quiz(title: str) -> str:
    return json.dumps(
        {
            "prompt": f"Which statement best describes {title.lower()}?",
            "mode": "radio",
            "options": [
                {"id": "a", "label": f"A core idea you apply when working with {title.lower()}"},
                {"id": "b", "label": "Something unrelated to this course"},
                {"id": "c", "label": "A step you can always skip"},
            ],
            "correct": ["a"],
        }
    )


def _lesson_ops(state: EditState, title: str, parent: str | None, topic: str) -> str:
    slug = _unique_slug(state, title)
    state.slugs.add(slug)
    state.ops.append({"op": "add_lesson", "slug": slug, "title": title, "parent": parent})
    state.ops.append(
        {
            "op": "add_block",
            "lesson": slug,
            "type": "ai_text",
            "title": title,
            "body": _reading(title, topic),
            "sourceName": "Course agent (mock)",
        }
    )
    state.ops.append(
        {
            "op": "add_block",
            "lesson": slug,
            "type": "quiz",
            "title": "Check yourself",
            "body": _quiz(title),
            "sourceName": "Course agent (mock)",
        }
    )
    return slug


def run_mock_editor(*, course: dict[str, Any], message: str, focus: str | None) -> dict[str, Any]:
    state = _state_for(course)
    topic = str(course.get("title") or course.get("topic") or "this course")
    text = message.lower()
    focus = focus if focus in state.slugs else None

    if not course.get("nodes") or "outline" in text or "build" in text and "course" in text:
        subject = _subject(message, topic)
        previous: str | None = None
        plan = [
            (f"What {subject} is", ["The big picture", "Core vocabulary"]),
            (f"Working with {subject}", ["Tools and workflow", "Common mistakes"]),
            (f"Building with {subject}", ["A guided project", "Ship and reflect"]),
        ]
        for module_title, lessons in plan:
            module = _lesson_ops(state, module_title, None, topic)
            for lesson in lessons:
                _lesson_ops(state, lesson, module, topic)
            if previous:
                state.ops.append({"op": "add_prerequisite", "from": previous, "to": module})
            previous = module
        return {
            "reply": f"Drafted a 3-module outline for {subject} with a reading and a quiz in every lesson.",
            "ops": state.ops,
            "model": "mock",
        }

    if "module" in text:
        subject = _subject(message, "New module")
        module = _lesson_ops(state, subject, None, topic)
        _lesson_ops(state, f"{subject}: key ideas", module, topic)
        _lesson_ops(state, f"{subject}: in practice", module, topic)
        return {
            "reply": f"Added the module “{subject}” with two lessons.",
            "ops": state.ops,
            "model": "mock",
        }

    if "lesson" in text and not focus or ("add a lesson" in text):
        subject = _subject(message, "New lesson")
        _lesson_ops(state, subject, focus, topic)
        return {"reply": f"Added the lesson “{subject}”.", "ops": state.ops, "model": "mock"}

    target = focus or next(iter(sorted(state.slugs)), None)
    if not target:
        return {
            "reply": "Tell me what the course is about and I'll draft the outline.",
            "ops": [],
            "model": "mock",
        }
    node = next(
        (n for n in course.get("nodes") or [] if n["slug"] == target),
        {"title": target, "blocks": []},
    )
    title = node["title"]
    added: str
    if "quiz" in text or "check" in text:
        state.ops.append(
            {
                "op": "add_block",
                "lesson": target,
                "type": "quiz",
                "title": "Check yourself",
                "body": _quiz(title),
            }
        )
        added = "a quiz"
    elif "flashcard" in text:
        state.ops.append(
            {
                "op": "add_block",
                "lesson": target,
                "type": "flashcard",
                "body": json.dumps(
                    {
                        "front": f"What is {title}?",
                        "back": f"The core idea of “{title}” in your own words.",
                    }
                ),
            }
        )
        added = "a flashcard"
    elif "video" in text or "watch" in text:
        state.ops.append(
            {
                "op": "add_block",
                "lesson": target,
                "type": "youtube",
                "title": "But what is a neural network?",
                "url": "https://www.youtube.com/watch?v=aircAruvnKk",
                "sourceName": "3Blue1Brown",
            }
        )
        added = "a video"
    elif "code" in text or "example" in text:
        state.ops.append(
            {
                "op": "add_block",
                "lesson": target,
                "type": "code",
                "title": "example.py",
                "body": json.dumps(
                    {"language": "python", "code": f"# {title}\nprint('hello, {topic}')"}
                ),
            }
        )
        added = "a code example"
    elif ("rewrite" in text or "simpl" in text) and any(
        b["type"] == "ai_text" for b in node.get("blocks") or []
    ):
        block = next(b for b in node["blocks"] if b["type"] == "ai_text")
        state.ops.append(
            {
                "op": "update_block",
                "id": block["id"],
                "body": _reading(title, topic).replace(
                    "Read it once", "In plain words: read it once"
                ),
            }
        )
        added = "a simpler rewrite"
    else:
        state.ops.append(
            {
                "op": "add_block",
                "lesson": target,
                "type": "ai_text",
                "title": title,
                "body": _reading(title, topic),
            }
        )
        added = "a reading"
    return {"reply": f"Added {added} to “{title}”.", "ops": state.ops, "model": "mock"}
