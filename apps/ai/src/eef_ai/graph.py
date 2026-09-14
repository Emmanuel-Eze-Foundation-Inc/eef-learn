"""Skeleton validation: nested tree plus a prerequisite DAG before persist."""

from typing import Any


def validate_skeleton(data: dict[str, Any]) -> list[str]:
    """Return a list of problems; empty list means the skeleton is valid."""
    errors: list[str] = []
    nodes = data.get("nodes")
    edges = data.get("edges", [])

    if not isinstance(nodes, list) or len(nodes) < 2:
        return ["skeleton must contain at least 2 nodes"]

    slugs: list[str] = []
    parents: dict[str, str | None] = {}
    for i, n in enumerate(nodes):
        slug = n.get("slug")
        if not slug or not isinstance(slug, str):
            errors.append(f"node[{i}] missing slug")
            continue
        slugs.append(slug)
        if not n.get("title"):
            errors.append(f"node '{slug}' missing title")
        if not isinstance(n.get("order"), int):
            errors.append(f"node '{slug}' missing integer order")
        parent = n.get("parent")
        if parent in ("", None):
            parents[slug] = None
        elif isinstance(parent, str):
            parents[slug] = parent
        else:
            errors.append(f"node[{i}] parent must be a slug")
            parents[slug] = None
    if len(set(slugs)) != len(slugs):
        errors.append("duplicate node slugs")

    known = set(slugs)
    for slug, parent in parents.items():
        if parent is None:
            continue
        if parent == slug:
            errors.append(f"node '{slug}' cannot be its own parent")
        elif parent not in known:
            errors.append(f"node '{slug}' parent is missing")

    for slug in slugs:
        seen: set[str] = set()
        current: str | None = slug
        while current and parents.get(current):
            if current in seen:
                errors.append("parent tree contains a cycle")
                break
            seen.add(current)
            current = parents.get(current)

    adj: dict[str, list[str]] = {s: [] for s in known}
    indeg: dict[str, int] = {s: 0 for s in known}
    for i, e in enumerate(edges):
        f, t = e.get("from"), e.get("to")
        kind = e.get("kind", "prerequisite")
        if kind != "prerequisite":
            continue
        if f not in known or t not in known:
            errors.append(f"edge[{i}] references unknown node ({f} -> {t})")
            continue
        if f == t:
            errors.append(f"edge[{i}] is a self-loop on '{f}'")
            continue
        adj[f].append(t)
        indeg[t] += 1

    if errors:
        return errors

    queue = [s for s in known if indeg[s] == 0]
    seen = 0
    while queue:
        cur = queue.pop()
        seen += 1
        for nxt in adj[cur]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                queue.append(nxt)
    if seen != len(known):
        errors.append("graph contains a cycle")
    return errors
