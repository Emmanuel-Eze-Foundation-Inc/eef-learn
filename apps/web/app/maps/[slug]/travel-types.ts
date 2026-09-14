import type { GraphNode, NodeState } from "./map-graph";
import { lerp, smoothstep } from "./path-layout";

export type { GraphEdge, GraphNode, NodeState } from "./map-graph";

export type StageBlock = {
  id: string;
  title: string | null;
  body: string | null;
  url: string | null;
  type: string;
  provenanceModel: string | null;
  attributionName: string | null;
  attributionUrl: string | null;
};

export type Stage = GraphNode & {
  blocks: StageBlock[];
};

export type Beat = {
  id: string;
  nodeIndex: number;
  nodeId: string;
  nodeSlug: string;
  nodeTitle: string;
  nodeState: NodeState;
  parentId: string | null;
  beatInNode: number;
  beatsInNode: number;
  isLastInNode: boolean;
  block: StageBlock | null;
};

export function lastUnlockedIndex(nodes: GraphNode[]): number {
  let last = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].state === "locked") break;
    last = i;
  }
  return last;
}

/** One scroll-stop per content block so lessons stream instead of dumping. */
export function stagesToBeats(stages: Stage[]): Beat[] {
  const beats: Beat[] = [];
  stages.forEach((stage, nodeIndex) => {
    const blocks = stage.blocks.length > 0 ? stage.blocks : [null];
    blocks.forEach((block, i) => {
      beats.push({
        id: block?.id ?? `${stage.id}-intro`,
        nodeIndex,
        nodeId: stage.id,
        nodeSlug: stage.slug,
        nodeTitle: stage.title,
        nodeState: stage.state,
        parentId: stage.parentId ?? null,
        beatInNode: i,
        beatsInNode: blocks.length,
        isLastInNode: i === blocks.length - 1,
        block,
      });
    });
  });
  return beats;
}

export function lastUnlockedBeatIndex(beats: Beat[], lastNode: number): number {
  let last = 0;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].nodeIndex <= lastNode) last = i;
  }
  return last;
}

/** Camera rides the stars, easing forward as you finish beats inside a star. */
export function nodeProgressFromBeats(beats: Beat[], progress: number): number {
  if (beats.length === 0) return 0;
  const max = beats.length - 1;
  const t = Math.min(Math.max(progress, 0), max);
  const i = Math.min(Math.floor(t), Math.max(max - 1, 0));
  const frac = max === 0 ? 0 : t - i;
  const a = beats[i];
  const b = beats[Math.min(i + 1, max)];
  return lerp(pos(a), pos(b), smoothstep(frac));
}

function pos(beat: Beat): number {
  return beat.nodeIndex + (beat.beatsInNode > 1 ? beat.beatInNode / beat.beatsInNode : 0);
}

export function firstBeatOfNode(beats: Beat[], nodeIndex: number): number {
  const i = beats.findIndex((b) => b.nodeIndex === nodeIndex);
  return i < 0 ? 0 : i;
}
