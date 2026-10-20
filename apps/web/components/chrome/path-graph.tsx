"use client";

import { ContentMark, contentKind } from "@/app/maps/[slug]/content-mark";
import { cn } from "@/lib/utils";

export type PathGraphState = "mastered" | "in_progress" | "available" | "locked" | "idle";

export type PathGraphNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  state?: PathGraphState;
  leadType?: string | null;
  current?: boolean;
};

export type PathGraphEdge = {
  fromId: string;
  toId: string;
  kind: "contains" | "prerequisite";
};

function nodeFill(state: PathGraphState | undefined, current: boolean | undefined): string {
  if (current) return "var(--aurora-400)";
  switch (state) {
    case "mastered":
      return "var(--gold-400)";
    case "in_progress":
      return "var(--aurora-400)";
    case "locked":
      return "var(--night-950)";
    case "available":
    case "idle":
    case undefined:
      return "var(--night-900)";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function nodeStroke(state: PathGraphState | undefined, current: boolean | undefined): string {
  if (current) return "var(--aurora-400)";
  switch (state) {
    case "mastered":
      return "var(--gold-400)";
    case "in_progress":
    case "available":
      return "var(--aurora-400)";
    case "locked":
      return "var(--night-800)";
    case "idle":
    case undefined:
      return "var(--star-400)";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Real map graph: contains are solid, prerequisites dashed. Nodes show content type. */
export function PathGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
  className,
  interactive = true,
  showLabels = true,
}: {
  nodes: PathGraphNode[];
  edges: PathGraphEdge[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  interactive?: boolean;
  showLabels?: boolean;
}) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = (xs.length ? Math.min(...xs) : 0) - 56;
  const minY = (ys.length ? Math.min(...ys) : 0) - 40;
  const maxX = (xs.length ? Math.max(...xs) : 200) + 56;
  const maxY = (ys.length ? Math.max(...ys) : 120) + 48;
  const width = Math.max(280, maxX - minX);
  const height = Math.max(160, maxY - minY);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className={cn("overflow-hidden", className)}>
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        width="100%"
        height="100%"
        role="group"
        aria-label="Learning map"
        className="min-h-[10rem]"
      >
        {edges.map((edge) => {
          const a = byId.get(edge.fromId);
          const b = byId.get(edge.toId);
          if (!a || !b) return null;
          const traveled = a.state === "mastered";
          return (
            <line
              key={`${edge.kind}-${edge.fromId}-${edge.toId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={traveled ? "var(--gold-400)" : "var(--star-400)"}
              strokeWidth={edge.kind === "contains" ? 1.8 : 1.3}
              strokeDasharray={edge.kind === "prerequisite" ? "5 5" : undefined}
              opacity={0.75}
            />
          );
        })}
        {nodes.map((node) => {
          const current = node.current || node.id === selectedId;
          const locked = node.state === "locked";
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              {current ? (
                <circle
                  r={22}
                  fill="none"
                  stroke="var(--aurora-400)"
                  strokeWidth={1.2}
                  opacity={0.7}
                  className="motion-safe:animate-[aurora-halo_2.4s_ease-in-out_infinite]"
                />
              ) : null}
              <circle r={16} fill={nodeFill(node.state, current)} stroke={nodeStroke(node.state, current)} strokeWidth={1.6} />
              <g transform="translate(-10 -10)" className="pointer-events-none">
                <ContentMark
                  kind={contentKind(node.leadType)}
                  mastered={node.state === "mastered"}
                  current={current}
                  size={20}
                />
              </g>
              {showLabels ? (
                <text
                  y={30}
                  textAnchor="middle"
                  className="fill-star-100"
                  fontSize={10}
                  style={{ pointerEvents: "none" }}
                >
                  {node.title.length > 22 ? `${node.title.slice(0, 21)}…` : node.title}
                </text>
              ) : null}
              {interactive ? (
                <circle
                  r={18}
                  fill="transparent"
                  className={locked ? "cursor-not-allowed" : "cursor-pointer"}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  aria-label={node.title}
                  onClick={() => {
                    if (!locked) onSelect?.(node.id);
                  }}
                  onKeyDown={(e) => {
                    if (locked) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(node.id);
                    }
                  }}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
