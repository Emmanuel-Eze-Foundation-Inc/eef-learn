"""Deterministic mock AI provider.

Default provider (`AI_PROVIDER=mock`). Powers hello-world and CI e2e without spend.
Outputs are stable for a given input so tests can assert on them.
"""

import hashlib
import json
from typing import Any


def _seed(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)


def generate_map_skeleton(topic: str) -> dict[str, Any]:
    """Return a small deterministic DAG for any topic."""
    slug = topic.lower().strip().replace(" ", "-")[:40] or "topic"
    nodes = [
        {"slug": f"{slug}-foundations", "title": f"{topic}: Foundations", "order": 0},
        {"slug": f"{slug}-core-ideas", "title": f"{topic}: Core ideas", "order": 1},
        {"slug": f"{slug}-practice", "title": f"{topic}: Practice", "order": 2},
        {"slug": f"{slug}-next-star", "title": f"{topic}: The next star", "order": 3},
    ]
    edges = [
        {"from": nodes[0]["slug"], "to": nodes[1]["slug"], "kind": "prerequisite"},
        {"from": nodes[1]["slug"], "to": nodes[2]["slug"], "kind": "prerequisite"},
        {"from": nodes[2]["slug"], "to": nodes[3]["slug"], "kind": "prerequisite"},
    ]
    return {"topic": topic, "seed": _seed(topic), "nodes": nodes, "edges": edges}


def generate_section_text(node_slug: str) -> dict[str, Any]:
    return {
        "type": "ai_text",
        "title": f"About {node_slug.replace('-', ' ')}",
        "body": (
            f"This is deterministic mock content for `{node_slug}`. "
            "Set AI_PROVIDER=openrouter (plus AI_API_KEY) for real generation."
        ),
        "provenance": {
            "model": "mock-model",
            "prompt_hash": hashlib.sha256(node_slug.encode()).hexdigest()[:16],
            "sources": [],
        },
    }


def embed(texts: list[str], dimensions: int = 768) -> list[list[float]]:
    """Deterministic pseudo-embeddings: hash-seeded, unit-ish vectors."""
    out: list[list[float]] = []
    for t in texts:
        s = _seed(t)
        vec = [(((s >> (i % 24)) & 0xFF) / 255.0) - 0.5 for i in range(dimensions)]
        out.append(vec)
    return out


def chat(messages: list[dict[str, str]]) -> str:
    last = messages[-1]["content"] if messages else ""
    return f"[mock companion] You said: {json.dumps(last)}. I am the deterministic mock provider."
