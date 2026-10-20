import { PathGraph } from "@/components/chrome/path-graph";
import type { PublicMapEdge, PublicMapNode } from "@/lib/public-maps";

/** Unique sky window for one published map: real nodes, real edges. */
export function MiniConstellation({
  nodes,
  edges,
  active = false,
}: {
  slug?: string;
  nodes: PublicMapNode[];
  edges: PublicMapEdge[];
  active?: boolean;
}) {
  if (nodes.length === 0) {
    return <div className="h-full w-full bg-night-950" />;
  }
  return (
    <PathGraph
      className="h-full w-full bg-night-950"
      interactive={false}
      showLabels={false}
      selectedId={active ? nodes[0]?.id : null}
      nodes={nodes.map((n, i) => ({
        id: n.id,
        title: n.title,
        x: n.positionX,
        y: n.positionY,
        leadType: n.leadType,
        current: active && i === 0,
        state: "idle",
      }))}
      edges={edges}
    />
  );
}
