"use client";

import { flattenTree, nodeDepth } from "@eef/core";

export type StudioNode = {
  id: string;
  slug: string;
  title: string;
  order: number;
  parentId: string | null;
};

export type StudioEdge = { fromId: string; toId: string };

function layout(nodes: StudioNode[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const flat = flattenTree(nodes);
  const col = new Map<string, number>();
  const siblingIndex = new Map<string, number>();

  for (const node of nodes) {
    const sibs = nodes
      .filter((n) => n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    siblingIndex.set(node.id, sibs.findIndex((s) => s.id === node.id));
  }

  let rootCol = 0;
  for (const node of flat) {
    if (!node.parentId) {
      col.set(node.id, rootCol);
      rootCol += 1;
    } else {
      const parentCol = col.get(node.parentId) ?? 0;
      col.set(node.id, parentCol + (siblingIndex.get(node.id) ?? 0) * 0.42);
    }
    const depth = nodeDepth(nodes, node.id);
    pos.set(node.id, {
      x: 70 + (col.get(node.id) ?? 0) * 150,
      y: 48 + depth * 86,
    });
  }
  return pos;
}

/** Night-sky tree: contains implied by parent, dashed lines are prerequisites. */
export function StudioGraph({
  nodes,
  edges,
  selectedId,
  linkFromId,
  onSelect,
  onNest,
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  selectedId: string | null;
  linkFromId: string | null;
  onSelect: (id: string) => void;
  onNest: (childId: string, parentId: string | null) => void;
}) {
  const pos = layout(nodes);
  const xs = [...pos.values()].map((p) => p.x);
  const ys = [...pos.values()].map((p) => p.y);
  const width = Math.max(420, (xs.length ? Math.max(...xs) : 200) + 90);
  const height = Math.max(220, (ys.length ? Math.max(...ys) : 80) + 70);

  return (
    <div className="overflow-x-auto rounded-[1.75rem] border border-night-800 bg-night-900">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="group"
        aria-label="Map studio graph"
      >
        {nodes
          .filter((n) => n.parentId && pos.has(n.parentId))
          .map((n) => {
            const a = pos.get(n.parentId!)!;
            const b = pos.get(n.id)!;
            return (
              <line
                key={`p-${n.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--aurora-400)"
                strokeOpacity={0.45}
                strokeWidth={1.6}
              />
            );
          })}
        {edges.map((e) => {
          const a = pos.get(e.fromId);
          const b = pos.get(e.toId);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.fromId}-${e.toId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--star-400)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="5 6"
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const selected = n.id === selectedId;
          const linking = n.id === linkFromId;
          const depth = nodeDepth(nodes, n.id);
          return (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={n.title}
              className="cursor-pointer"
              onClick={() => onSelect(n.id)}
              onDoubleClick={() => {
                if (selectedId && selectedId !== n.id) onNest(selectedId, n.id);
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onSelect(n.id);
                }
              }}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={depth ? 10 : 13}
                fill="var(--night-950)"
                stroke={selected || linking ? "var(--aurora-400)" : "var(--star-400)"}
                strokeWidth={selected ? 2.6 : 1.6}
              />
              <text
                x={p.x}
                y={p.y + (depth ? 26 : 30)}
                textAnchor="middle"
                fill="var(--star-100)"
                fontSize={12}
                fontWeight={600}
              >
                {n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
