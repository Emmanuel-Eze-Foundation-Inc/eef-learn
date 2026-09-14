"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LearnLockup } from "../../../components/learn-lockup";
import { PublishButton } from "../publish-button";
import { BeatInspector, type StudioBlock } from "./beat-inspector";
import { StudioGraph, type StudioEdge, type StudioNode } from "./studio-graph";

export type StudioPayload = {
  mapId: string;
  slug: string;
  title: string;
  topic: string;
  visibility: string;
  nodes: (StudioNode & { blocks: StudioBlock[] })[];
  edges: StudioEdge[];
};

/** Creator studio: nest lessons, draw prerequisites, fill beats, then enter. */
export function MapStudio({ initial }: { initial: StudioPayload }) {
  const title = initial.title;
  const [nodes, setNodes] = useState(initial.nodes);
  const [edges, setEdges] = useState(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(initial.nodes[0]?.id ?? null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const ready = nodes.length >= 2 && nodes.every((n) => n.title.trim().length > 0);

  const graphNodes = useMemo(
    () => nodes.map(({ blocks: _b, ...n }) => n),
    [nodes],
  );

  async function addNode() {
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/maps/${initial.mapId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New lesson", parentId: selectedId }),
    });
    const body = await res.json().catch(() => ({}));
    setAdding(false);
    if (!res.ok) {
      setError(body.error ?? "Could not add that lesson.");
      return;
    }
    setNodes((list) => [...list, { ...body.node, parentId: body.node.parentId ?? null, blocks: [] }]);
    setSelectedId(body.node.id);
  }

  async function rename(nodeId: string, nextTitle: string) {
    const res = await fetch(`/api/maps/${initial.mapId}/nodes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId, title: nextTitle }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not rename.");
      return;
    }
    setNodes((list) => list.map((n) => (n.id === nodeId ? { ...n, title: nextTitle } : n)));
  }

  async function nest(childId: string, parentId: string | null) {
    setError(null);
    const res = await fetch(`/api/maps/${initial.mapId}/nodes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: childId, parentId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not nest that lesson.");
      return;
    }
    setNodes((list) => list.map((n) => (n.id === childId ? { ...n, parentId } : n)));
  }

  async function removeNode(nodeId: string) {
    const res = await fetch(`/api/maps/${initial.mapId}/nodes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId }),
    });
    if (!res.ok) return;
    setNodes((list) =>
      list
        .filter((n) => n.id !== nodeId)
        .map((n) => (n.parentId === nodeId ? { ...n, parentId: null } : n)),
    );
    setEdges((list) => list.filter((e) => e.fromId !== nodeId && e.toId !== nodeId));
    setSelectedId((id) => (id === nodeId ? null : id));
  }

  async function toggleLink(targetId: string) {
    if (!linkFromId) {
      setLinkFromId(targetId);
      return;
    }
    if (linkFromId === targetId) {
      setLinkFromId(null);
      return;
    }
    const existing = edges.find((e) => e.fromId === linkFromId && e.toId === targetId);
    const method = existing ? "DELETE" : "POST";
    const res = await fetch(`/api/maps/${initial.mapId}/edges`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromId: linkFromId, toId: targetId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not change that link.");
      setLinkFromId(null);
      return;
    }
    setEdges((list) =>
      existing
        ? list.filter((e) => !(e.fromId === linkFromId && e.toId === targetId))
        : [...list, { fromId: linkFromId, toId: targetId }],
    );
    setLinkFromId(null);
  }

  async function addBlock(type: "youtube" | "blog" | "ai_text" | "flashcard" | "quiz") {
    if (!selected) return;
    const res = await fetch(`/api/nodes/${selected.id}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title: "" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not add that beat.");
      return;
    }
    setNodes((list) =>
      list.map((n) => (n.id === selected.id ? { ...n, blocks: [...n.blocks, body.block] } : n)),
    );
  }

  async function saveBlock(block: StudioBlock) {
    if (!selected) return;
    const res = await fetch(`/api/nodes/${selected.id}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId: block.id,
        title: block.title,
        body: block.body,
        url: block.url,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save that beat.");
      return;
    }
    setNodes((list) =>
      list.map((n) =>
        n.id === selected.id
          ? { ...n, blocks: n.blocks.map((b) => (b.id === block.id ? block : b)) }
          : n,
      ),
    );
  }

  async function deleteBlock(blockId: string) {
    if (!selected) return;
    await fetch(`/api/nodes/${selected.id}/blocks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    setNodes((list) =>
      list.map((n) =>
        n.id === selected.id ? { ...n, blocks: n.blocks.filter((b) => b.id !== blockId) } : n,
      ),
    );
  }

  async function generateBeat() {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/nodes/${selected.id}/sections`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGenerating(false);
      setError(body.error ?? "Could not generate.");
      return;
    }
    const jobId = body.jobId as string;
    const poll = async () => {
      const job = await fetch(`/api/jobs/${jobId}`);
      const data = await job.json();
      if (data.status === "succeeded") {
        setGenerating(false);
        window.location.reload();
        return;
      }
      if (data.status === "failed") {
        setGenerating(false);
        setError(data.error ?? "Generation failed.");
        return;
      }
      setTimeout(poll, 1200);
    };
    poll();
  }

  function onSelect(id: string) {
    if (linkFromId) {
      void toggleLink(id);
      return;
    }
    setSelectedId(id);
  }

  return (
    <main className="min-h-screen bg-night-950 text-star-100">
      <nav className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-12">
        <Link href="/dashboard" className="flex items-center">
          <LearnLockup />
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <PublishButton mapId={initial.mapId} slug={initial.slug} visibility={initial.visibility} />
          <Link
            href={`/maps/${initial.slug}`}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${
              ready
                ? "bg-aurora-400 text-ink-900"
                : "border border-night-800 text-star-400"
            }`}
          >
            Enter map
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-[1200px] px-6 pb-24 lg:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">Studio</p>
        <input
          value={title}
          readOnly
          className="mt-2 w-full bg-transparent text-4xl font-bold tracking-tight outline-none"
          aria-label="Map title"
        />
        <p className="mt-3 max-w-[58ch] text-star-400">
          Nest a lesson under another with a double-click. Draw what has to come first, then fill
          each beat. Launch when the path holds.
        </p>
        {error && (
          <p role="alert" className="mt-5 text-sm text-ember-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void addNode()}
            disabled={adding}
            className="rounded-full bg-aurora-400 px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-60"
          >
            Add lesson
          </button>
          <button
            type="button"
            onClick={() => setLinkFromId(selectedId)}
            disabled={!selectedId}
            className={`rounded-full border px-4 py-2 text-sm ${
              linkFromId
                ? "border-aurora-400 text-aurora-400"
                : "border-night-800 text-star-400 hover:border-star-400"
            }`}
          >
            {linkFromId ? "Click the lesson that comes after" : "Draw prerequisite"}
          </button>
          {selected && selected.parentId && (
            <button
              type="button"
              onClick={() => void nest(selected.id, null)}
              className="rounded-full border border-night-800 px-4 py-2 text-sm text-star-400 hover:border-star-400"
            >
              Lift to root
            </button>
          )}
          {selected && (
            <button
              type="button"
              onClick={() => void removeNode(selected.id)}
              className="rounded-full border border-night-800 px-4 py-2 text-sm text-star-400 hover:border-ember-500"
            >
              Remove lesson
            </button>
          )}
        </div>
        {!ready && (
          <p className="mt-4 text-sm text-star-400">Add at least two named lessons before you enter.</p>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,22rem)]">
          <StudioGraph
            nodes={graphNodes}
            edges={edges}
            selectedId={selectedId}
            linkFromId={linkFromId}
            onSelect={onSelect}
            onNest={(child, parent) => void nest(child, parent)}
          />
          {selected ? (
            <div>
              <label className="mb-4 block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
                  Lesson name
                </span>
                <input
                  value={selected.title}
                  onChange={(e) =>
                    setNodes((list) =>
                      list.map((n) => (n.id === selected.id ? { ...n, title: e.target.value } : n)),
                    )
                  }
                  onBlur={(e) => void rename(selected.id, e.target.value.trim() || selected.title)}
                  className="mt-2 w-full rounded-2xl border border-night-800 bg-night-900 px-4 py-3 outline-none focus:border-aurora-400"
                />
              </label>
              <BeatInspector
                nodeTitle={selected.title}
                blocks={selected.blocks}
                generating={generating}
                onAdd={(type) => void addBlock(type)}
                onSave={(block) => void saveBlock(block)}
                onDelete={(id) => void deleteBlock(id)}
                onGenerate={() => void generateBeat()}
              />
            </div>
          ) : (
            <p className="text-sm text-star-400">Select a lesson to name it and fill its beats.</p>
          )}
        </div>
      </div>
    </main>
  );
}
