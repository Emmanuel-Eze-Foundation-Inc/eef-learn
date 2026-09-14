"use client";

import { layoutNodes, type GraphEdge, type GraphNode } from "./map-graph";

const STYLE: Record<GraphNode["state"], { fill: string; stroke: string }> = {
  mastered: { fill: "var(--gold-400)", stroke: "var(--gold-400)" },
  in_progress: { fill: "var(--night-900)", stroke: "var(--aurora-400)" },
  available: { fill: "var(--night-900)", stroke: "var(--star-400)" },
  locked: { fill: "var(--night-950)", stroke: "var(--night-800)" },
};

/** Side skeleton — jump between stages without leaving the 3D world. */
export function MiniMap({
  nodes,
  edges,
  activeIndex,
  onJump,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  const pos = layoutNodes(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const width = Math.max(220, 40 + nodes.length * 52);
  const behind = Math.max(0, activeIndex);
  const ahead = Math.max(0, nodes.length - 1 - activeIndex);

  return (
    <aside
      className="pointer-events-auto w-[220px] rounded-2xl border border-night-800/80 bg-night-950/70 p-4 backdrop-blur-md"
      aria-label="Map skeleton"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">
        Star {activeIndex + 1} of {nodes.length}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-star-400">
        {behind} behind · {ahead} ahead
      </p>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} 88`}
          width={width}
          height={88}
          role="list"
          aria-label="Jump to a star"
        >
          {edges.map((e) => {
            const a = pos.get(e.fromId);
            const b = pos.get(e.toId);
            if (!a || !b) return null;
            const traveled = byId.get(e.fromId)?.state === "mastered";
            const sx = (p: { x: number; y: number }) => 16 + (p.x / (90 + nodes.length * 170)) * (width - 32);
            const sy = (p: { y: number }) => 20 + ((p.y - 110) / 180) * 48;
            return (
              <line
                key={`${e.fromId}-${e.toId}`}
                x1={sx(a)}
                y1={sy(a)}
                x2={sx(b)}
                y2={sy(b)}
                stroke={traveled ? "var(--gold-400)" : "var(--aurora-400)"}
                strokeOpacity={traveled ? 0.95 : 0.4}
                strokeWidth={traveled ? 2 : 1.25}
                strokeDasharray={traveled ? undefined : "3 4"}
              />
            );
          })}
          {nodes.map((n, i) => {
            const p = pos.get(n.id)!;
            const s = STYLE[n.state];
            const sx = 16 + (p.x / (90 + nodes.length * 170)) * (width - 32);
            const sy = 20 + ((p.y - 110) / 180) * 48;
            const locked = n.state === "locked";
            const current = i === activeIndex;
            return (
              <g key={n.id} role="listitem">
                {current && (
                  <circle cx={sx} cy={sy} r={11} fill="var(--aurora-400)" opacity={0.22} />
                )}
                <circle
                  cx={sx}
                  cy={sy}
                  r={6}
                  fill={s.fill}
                  stroke={current ? "var(--aurora-400)" : s.stroke}
                  strokeWidth={current ? 2.5 : 1.75}
                  className={locked ? "cursor-not-allowed" : "cursor-pointer"}
                  onClick={() => {
                    if (!locked) onJump(i);
                  }}
                  aria-label={locked ? `${n.title}, locked` : `Jump to ${n.title}`}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  onKeyDown={(ev) => {
                    if (!locked && (ev.key === "Enter" || ev.key === " ")) {
                      ev.preventDefault();
                      onJump(i);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <ol className="mt-2 space-y-1">
        {nodes.map((n, i) => (
          <li key={n.id}>
            <button
              type="button"
              disabled={n.state === "locked"}
              onClick={() => onJump(i)}
              className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                i === activeIndex ? "text-aurora-400" : "text-star-400 hover:text-star-100"
              }`}
            >
              <span className="font-mono w-4 text-right">{i + 1}</span>
              <span className="truncate">{n.title}</span>
              {n.state === "mastered" && <span className="ml-auto text-gold-400">★</span>}
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
