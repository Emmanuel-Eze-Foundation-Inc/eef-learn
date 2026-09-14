import Link from "next/link";

/** Node states follow BRAND.md map language: gold = earned, aurora = offered. */
export type NodeState = "mastered" | "in_progress" | "available" | "locked";

export type GraphNode = {
  id: string;
  slug: string;
  title: string;
  order: number;
  state: NodeState;
};

export type GraphEdge = { fromId: string; toId: string };

function seeded(n: number): number {
  // deterministic jitter in [-1, 1] so a map always renders the same sky
  const x = Math.sin(n * 9973) * 10000;
  return (x - Math.floor(x)) * 2 - 1;
}

export function layoutNodes(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  sorted.forEach((node, i) => {
    const x = 90 + i * 170;
    const y = 200 + Math.sin(i * 1.1) * 90 + seeded(node.order + 1) * 28;
    pos.set(node.id, { x, y });
  });
  return pos;
}

const NODE_STYLE: Record<NodeState, { fill: string; stroke: string; label: string }> = {
  mastered: { fill: "var(--gold-400)", stroke: "var(--gold-400)", label: "Mastered" },
  in_progress: { fill: "var(--night-900)", stroke: "var(--aurora-400)", label: "In progress" },
  available: { fill: "var(--night-900)", stroke: "var(--star-400)", label: "Ready to travel" },
  locked: { fill: "var(--night-950)", stroke: "var(--night-800)", label: "Locked" },
};

/** Server-rendered constellation (ticket T8): SVG links, deterministic layout. */
export function MapGraph({
  mapSlug,
  nodes,
  edges,
  onSelect,
}: {
  mapSlug: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelect?: (slug: string) => void;
}) {
  const pos = layoutNodes(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const width = Math.max(700, 90 + nodes.length * 170 + 90);

  return (
    <div className="overflow-x-auto rounded-2xl border border-night-800 bg-night-900">
      <svg
        viewBox={`0 0 ${width} 400`}
        width={width}
        height={400}
        role="group"
        aria-label={`Learning map with ${nodes.length} stars`}
      >
        {/* edges */}
        {edges.map((e) => {
          const a = pos.get(e.fromId);
          const b = pos.get(e.toId);
          if (!a || !b) return null;
          const from = byId.get(e.fromId);
          const traveled = from?.state === "mastered";
          return (
            <line
              key={`${e.fromId}-${e.toId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={traveled ? "var(--gold-400)" : "var(--star-400)"}
              strokeOpacity={traveled ? 0.9 : 0.35}
              strokeWidth={traveled ? 2 : 1.5}
              strokeDasharray={traveled ? undefined : "5 6"}
            />
          );
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const s = NODE_STYLE[n.state];
          const interactive = n.state !== "locked";
          const circle = (
            <g>
              {n.state === "in_progress" && (
                <circle cx={p.x} cy={p.y} r={22} fill="var(--aurora-400)" opacity={0.15} />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={2.5}
              />
              {n.state === "mastered" && (
                <circle cx={p.x} cy={p.y} r={5} fill="var(--ink-900)" />
              )}
              <text
                x={p.x}
                y={p.y + 40}
                textAnchor="middle"
                fill={n.state === "locked" ? "var(--star-400)" : "var(--star-100)"}
                opacity={n.state === "locked" ? 0.55 : 1}
                fontSize={13}
                fontWeight={600}
              >
                {n.title.length > 24 ? `${n.title.slice(0, 23)}…` : n.title}
              </text>
              <text
                x={p.x}
                y={p.y + 58}
                textAnchor="middle"
                fill={n.state === "mastered" ? "var(--gold-400)" : "var(--star-400)"}
                fontSize={10}
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
              >
                {s.label}
              </text>
            </g>
          );
          return interactive ? (
            onSelect ? (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`${n.title} — ${s.label}`}
                className="cursor-pointer focus:outline-none"
                onClick={() => onSelect(n.slug)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onSelect(n.slug);
                  }
                }}
              >
                {circle}
              </g>
            ) : (
              <Link
                key={n.id}
                href={`/maps/${mapSlug}/${n.slug}`}
                aria-label={`${n.title} — ${s.label}`}
                className="focus:outline-none [&:focus_circle]:stroke-aurora-400"
              >
                {circle}
              </Link>
            )
          ) : (
            <g key={n.id} aria-label={`${n.title} — locked`}>
              {circle}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
