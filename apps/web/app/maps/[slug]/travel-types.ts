import type { GraphEdge, GraphNode, NodeState } from "./map-graph";

export type { GraphEdge, GraphNode, NodeState };

export type StageBlock = {
  id: string;
  title: string | null;
  body: string | null;
  url: string | null;
  type: string;
  provenanceModel: string | null;
};

export type Stage = GraphNode & {
  blocks: StageBlock[];
};

export function lastUnlockedIndex(nodes: GraphNode[]): number {
  let last = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].state === "locked") break;
    last = i;
  }
  return last;
}
