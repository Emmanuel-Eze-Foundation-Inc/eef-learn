"""OpenRouter / OpenAI-compatible provider (gate T-2: per-task model routing).

Uses the chat-completions dialect so AI_BASE_URL can also point at OpenAI,
Ollama, or any compatible endpoint.
"""

import hashlib
import json
import re
from typing import Any

import httpx

from eef_ai.settings import Settings

DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

SKELETON_PROMPT = """You are a curriculum designer. Build a learning map for the topic: {topic}
{brief}

Return ONLY a JSON object with this exact shape (no markdown fences, no prose):
{{"nodes": [{{"slug": "kebab-case-id", "title": "Human title", "order": 0, "parent": null}}],
  "edges": [{{"from": "slug-a", "to": "slug-b", "kind": "prerequisite"}}]}}

Rules: 4-12 nodes; slugs kebab-case and unique; 1-2 nesting levels via parent (slug of
the parent node, or null for roots); sibling order starts at 0 under each parent;
edges are a DAG of prerequisites only (what must come first), not the parent tree."""

SECTION_PROMPT = """Write a focused lesson for the learning-map node "{node_title}"
(topic: {topic}). 3-6 short paragraphs, markdown, factual, cite claims inline as
plain text. Return ONLY JSON: {{"title": "...", "body": "markdown here"}}"""


def _extract_json(text: str) -> dict[str, Any]:
    """Parse model output as JSON, tolerating markdown fences."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


class OpenRouterProvider:
    def __init__(self, settings: Settings, api_key: str | None = None):
        self.settings = settings
        self.base_url = settings.ai_base_url or DEFAULT_BASE_URL
        token = api_key or settings.ai_api_key
        self.headers = {"Authorization": f"Bearer {token}"}

    async def _complete(self, model: str, prompt: str, max_tokens: int = 4000) -> str:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def map_skeleton(self, topic: str, brief: dict[str, Any] | None = None) -> dict[str, Any]:
        model = self.settings.model_for("skeleton")
        brief_lines = ""
        if brief:
            parts = [f"{k}: {v}" for k, v in brief.items() if v]
            if parts:
                brief_lines = "Creator notes:\n" + "\n".join(f"- {p}" for p in parts)
        raw = await self._complete(model, SKELETON_PROMPT.format(topic=topic, brief=brief_lines))
        data = _extract_json(raw)
        data["topic"] = topic
        return data

    async def section_text(self, *, topic: str, node_slug: str, node_title: str) -> dict[str, Any]:
        model = self.settings.model_for("section")
        prompt = SECTION_PROMPT.format(node_title=node_title, topic=topic)
        raw = await self._complete(model, prompt)
        data = _extract_json(raw)
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

    async def chat(self, messages: list[dict[str, str]]) -> str:
        model = self.settings.model_for("chat")
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json={"model": model, "messages": messages, "max_tokens": 2000},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def embed(self, texts: list[str], dimensions: int) -> list[list[float]]:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                headers=self.headers,
                json={"model": self.settings.embeddings_model, "input": texts},
            )
            resp.raise_for_status()
            return [d["embedding"] for d in resp.json()["data"]]
