"""The user's own model, over the chat-completions dialect.

EEF Learn holds no model key. Every call runs on a key the user brought, for one of the
providers below; each exposes an OpenAI-compatible chat-completions endpoint.
"""

import base64
import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any

import httpx
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from eef_ai.settings import Settings

ENDPOINTS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "google": "https://generativelanguage.googleapis.com/v1beta/openai",
}

# OpenRouter model ids per task; AI_MODEL_* settings override them (they're OpenRouter ids too).
DEFAULT_MODELS = {
    "skeleton": "openai/gpt-4o-mini",
    "section": "openai/gpt-4o-mini",
    "chat": "openai/gpt-4o-mini",
    "enrich": "openai/gpt-4o-mini",
}
PROVIDER_DEFAULT_MODEL = {
    "openai": "gpt-5.6-terra",
    "anthropic": "claude-sonnet-5-5",
    "google": "gemini-3.8-flash",
}
DEFAULT_EMBEDDINGS = "openai/text-embedding-3-small"


class NoUserModel(Exception):
    """An AI call was asked for without the user's own key. The platform never pays."""


@dataclass(frozen=True)
class UserModel:
    provider: str
    key: str
    model: str | None = None

    @classmethod
    def parse(cls, raw: Any) -> "UserModel | None":
        if not isinstance(raw, dict):
            return None
        provider, key, model = raw.get("provider"), raw.get("key"), raw.get("model")
        if provider not in ENDPOINTS or not isinstance(key, str) or not key.strip():
            return None
        return cls(provider, key.strip(), model if isinstance(model, str) and model.strip() else None)


JOB_PREFIX = "j1:"


def unseal_key(sealed: str, tokens: list[str]) -> str | None:
    """Open a key sealed by apps/web sealForJob (AES-256-GCM, HKDF of AI_SERVICE_TOKEN)."""
    if not sealed.startswith(JOB_PREFIX):
        return None
    try:
        blob = base64.urlsafe_b64decode(sealed[len(JOB_PREFIX) :] + "=" * (-len(sealed) % 4))
    except ValueError:
        return None
    iv, rest = blob[:12], blob[12:]
    for token in tokens:
        key = HKDF(algorithm=hashes.SHA256(), length=32, salt=b"eef-job-key", info=b"user-model v1").derive(
            token.encode()
        )
        try:
            return AESGCM(key).decrypt(iv, rest, None).decode()
        except InvalidTag:
            continue
    return None


def job_user_model(raw: Any, settings: Settings) -> "UserModel | None":
    """The user model from a GenerationJob payload, whose key is always sealed."""
    if not isinstance(raw, dict) or not isinstance(raw.get("sealedKey"), str):
        return None
    tokens = [t for t in (settings.ai_service_token, settings.ai_service_token_next) if t]
    key = unseal_key(raw["sealedKey"], tokens)
    return UserModel.parse({**raw, "key": key}) if key else None


def resolve_model(settings: Settings, user: UserModel, task: str) -> str:
    """The user's chosen model, else the provider default (OpenRouter: per-task settings)."""
    if user.model:
        return user.model
    if user.provider != "openrouter":
        return PROVIDER_DEFAULT_MODEL[user.provider]
    name = settings.model_for(task)  # type: ignore[arg-type]
    if not name or name.startswith("mock"):
        return DEFAULT_MODELS[task]
    return name


SKELETON_PROMPT = """You are building a learning map with the EEF Learn course-create skill.
Search the web for how this topic is actually taught. Then design MODULES — real lesson
names, not template slots like Foundations / Core ideas / Practice.

Topic: {topic}
{brief}

Return ONLY JSON (no markdown fences):
{{"nodes": [{{"slug": "kebab-case-id", "title": "Specific lesson title", "order": 0, "parent": null}}],
  "edges": [{{"from": "slug-a", "to": "slug-b", "kind": "prerequisite"}}]}}

Rules:
- 5-10 nodes. Titles name the idea (e.g. "Tool calling vs ReAct"), never "{{topic}}: Foundations".
- 1-2 nesting levels via parent (parent slug or null). Sibling order starts at 0 under each parent.
- First node is the start; last root is the close. Edges are a prerequisite DAG, not the parent tree.
- Cover the brief. Skip vendor pitches."""

MODULE_BEATS_PROMPT = """Course-create skill, fill ONE module after web research.

Map topic: {topic}
This module: {node_title} (slug {node_slug})
{youtube_block}

Return ONLY a JSON array of 3-5 beats. Allowed types: youtube, blog, ai_text, quiz, flashcard.
Each object: {{"type","title","body","url","sourceName"}}

Must include:
1. youtube — only a URL from the verified list below, or a URL you actually found via search. Never invent a video id.
2. ai_text — 3-6 short teaching paragraphs, markdown, cite claims in plain text.
3. quiz — body is JSON: {{"mode":"radio"|"multi","prompt":"...","options":[{{"id":"a","label":"..."}}],"correct":["a"]}}
Optional: blog (real https essay/docs URL), flashcard (body JSON {{"front","back"}}).

If no honest video exists, omit youtube. Never hallucinate URLs."""

SECTION_PROMPT = """Write a focused lesson for the learning-map node "{node_title}"
(topic: {topic}). 3-6 short paragraphs, markdown, factual, cite claims inline as
plain text. Return ONLY JSON: {{"title": "...", "body": "markdown here"}}"""


def _extract_json(text: str) -> Any:
    """Parse model output as JSON, tolerating markdown fences."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


class ChatModelProvider:
    def __init__(self, settings: Settings, user: UserModel):
        self.settings = settings
        self.user = user
        self.base_url = ENDPOINTS[user.provider]
        self.headers = {"Authorization": f"Bearer {user.key}"}
        if user.provider == "openrouter":
            self.headers |= {"HTTP-Referer": "https://emmanuelezefoundation.org", "X-Title": "EEF Learn"}

    @property
    def web_search(self) -> bool:
        """OpenRouter's web plugin; other providers research through the agent's own tools."""
        return self.user.provider == "openrouter"

    def model_for(self, task: str) -> str:
        return resolve_model(self.settings, self.user, task)

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}{path}", headers=self.headers, json=payload)
            if resp.is_error:
                detail = resp.text[:800]
                raise httpx.HTTPStatusError(
                    f"{self.user.provider} {resp.status_code} for model {payload.get('model')}: {detail}",
                    request=resp.request,
                    response=resp,
                )
            return resp.json()

    async def _complete(
        self,
        model: str,
        prompt: str,
        max_tokens: int = 4000,
        extra: dict[str, Any] | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        }
        if extra:
            payload.update(extra)
        data = await self._post("/chat/completions", payload)
        return data["choices"][0]["message"]["content"]

    async def _complete_web(self, model: str, prompt: str, max_tokens: int = 4000) -> str:
        if not self.web_search:
            return await self._complete(model, prompt, max_tokens)
        extra = {"plugins": [{"id": "web", "max_results": 5}]}
        try:
            return await self._complete(model, prompt, max_tokens, extra)
        except httpx.HTTPStatusError:
            return await self._complete(model, prompt, max_tokens)

    async def map_skeleton(self, topic: str, brief: dict[str, Any] | None = None) -> dict[str, Any]:
        model = self.model_for("skeleton")
        brief_lines = ""
        if brief:
            parts = [f"{k}: {v}" for k, v in brief.items() if v]
            if parts:
                brief_lines = "Creator notes:\n" + "\n".join(f"- {p}" for p in parts)
        raw = await self._complete_web(
            model, SKELETON_PROMPT.format(topic=topic, brief=brief_lines), max_tokens=5000
        )
        data = _extract_json(raw)
        if not isinstance(data, dict):
            raise TypeError("skeleton must be a JSON object")
        data["topic"] = topic
        return data

    async def section_text(self, *, topic: str, node_slug: str, node_title: str) -> dict[str, Any]:
        model = self.model_for("section")
        prompt = SECTION_PROMPT.format(node_title=node_title, topic=topic)
        raw = await self._complete(model, prompt)
        data = _extract_json(raw)
        if not isinstance(data, dict):
            raise TypeError("section must be a JSON object")
        return {
            "type": "ai_text",
            "title": data.get("title", node_title),
            "body": data["body"],
            "provenance": {
                "model": model,
                "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest()[:16],
                "sources": [],
            },
        }

    async def module_beats(
        self,
        *,
        topic: str,
        node_slug: str,
        node_title: str,
        youtube_hits: list[dict[str, str]] | None = None,
    ) -> list[dict[str, Any]]:
        model = self.model_for("section")
        if youtube_hits:
            lines = "\n".join(f"- {h['url']} — {h['title']}" for h in youtube_hits)
            youtube_block = "Verified YouTube candidates (prefer these):\n" + lines
        else:
            youtube_block = "No YouTube Data API hits. Only include a video if web search found a real URL."
        raw = await self._complete_web(
            model,
            MODULE_BEATS_PROMPT.format(
                topic=topic,
                node_title=node_title,
                node_slug=node_slug,
                youtube_block=youtube_block,
            ),
            max_tokens=4000,
        )
        data = _extract_json(raw)
        if isinstance(data, dict) and "beats" in data:
            data = data["beats"]
        if not isinstance(data, list):
            raise TypeError("module beats must be a JSON array")
        return [row for row in data if isinstance(row, dict)]

    async def chat(self, messages: list[dict[str, str]]) -> str:
        model = self.model_for("chat")
        data = await self._post(
            "/chat/completions",
            {"model": model, "messages": messages, "max_tokens": 2000},
        )
        return data["choices"][0]["message"]["content"]

    async def embed(self, texts: list[str], dimensions: int) -> list[list[float]]:
        model = self.settings.embeddings_model
        if not model or model.startswith("mock"):
            model = DEFAULT_EMBEDDINGS
        data = await self._post("/embeddings", {"model": model, "input": texts})
        return [d["embedding"] for d in data["data"]]
