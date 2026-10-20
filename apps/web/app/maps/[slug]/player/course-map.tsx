"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleCheck, Lock } from "lucide-react";
import { useMemo } from "react";

import { useResolvedTheme } from "@/hooks/use-theme";
import { blockMeta } from "@/lib/blocks";
import { lessonMinutes, type CourseLesson, type CourseOutline } from "@/lib/course-model";
import { cn } from "@/lib/utils";

type MapNodeData = {
  lesson: CourseLesson;
  moduleIndex: number | null;
  current: boolean;
};

type MapFlowNode = Node<MapNodeData, "lesson">;

function LessonNode({ data }: NodeProps<MapFlowNode>) {
  const { lesson, current, moduleIndex } = data;
  const lead = lesson.blocks[0];
  const Icon = lead ? blockMeta(lead.type).icon : null;
  return (
    <div
      className={cn(
        "w-56 rounded-2xl border bg-night-900 px-4 py-3 text-left shadow-[0_8px_30px_var(--shadow-soft)] transition-colors",
        current
          ? "border-aurora-400 ring-4 ring-aurora-400/15"
          : lesson.state === "mastered"
            ? "border-gold-400/50"
            : lesson.state === "locked"
              ? "border-night-800 opacity-60"
              : "border-night-800 hover:border-star-400/60",
      )}
    >
      <Handle id="in" type="target" position={Position.Left} className="!border-0 !bg-transparent" />
      <Handle id="spine" type="source" position={Position.Left} className="!border-0 !bg-transparent" />
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-star-400 uppercase">
        {lesson.state === "mastered" ? (
          <CircleCheck className="size-3.5 text-gold-400" />
        ) : lesson.state === "locked" ? (
          <Lock className="size-3" />
        ) : Icon ? (
          <Icon className="size-3.5 text-aurora-400" />
        ) : null}
        <span>
          {moduleIndex !== null ? `Module ${moduleIndex + 1}` : lesson.parentId ? "Lesson" : "Start"}
        </span>
        {lesson.blocks.length ? <span className="ml-auto">{lessonMinutes(lesson)}m</span> : null}
      </div>
      <p className="mt-1.5 text-sm leading-snug font-semibold text-star-100">{lesson.title}</p>
      <Handle id="out" type="source" position={Position.Right} className="!border-0 !bg-transparent" />
    </div>
  );
}

const nodeTypes = { lesson: LessonNode };

/** The whole course as a map: nesting is solid, prerequisites are dashed. */
export function CourseMap({
  lessons,
  prerequisites,
  outline,
  currentId,
  onOpen,
}: {
  lessons: CourseLesson[];
  prerequisites: { fromId: string; toId: string }[];
  outline: CourseOutline;
  currentId: string;
  onOpen: (id: string) => void;
}) {
  const colorMode = useResolvedTheme();
  const { nodes, edges } = useMemo(() => {
    const moduleIndex = new Map(outline.modules.map((m, i) => [m.head.id, i]));
    const flowNodes: MapFlowNode[] = lessons.map((lesson) => ({
      id: lesson.id,
      type: "lesson",
      position: { x: lesson.positionX, y: lesson.positionY },
      data: { lesson, current: lesson.id === currentId, moduleIndex: moduleIndex.get(lesson.id) ?? null },
      draggable: false,
      connectable: false,
    }));
    const flowEdges: Edge[] = [
      ...lessons
        .filter((l) => l.parentId)
        .map((l) => ({
          id: `c:${l.parentId}->${l.id}`,
          source: l.parentId!,
          sourceHandle: "spine",
          target: l.id,
          targetHandle: "in",
          type: "smoothstep",
          pathOptions: { offset: 18, borderRadius: 10 },
          style: { stroke: l.state === "mastered" ? "var(--gold-400)" : "var(--edge)", strokeWidth: 1.5 },
        })),
      ...prerequisites.map((e) => ({
        id: `p:${e.fromId}->${e.toId}`,
        source: e.fromId,
        sourceHandle: "out",
        target: e.toId,
        targetHandle: "in",
        type: "smoothstep",
        animated: true,
        style: { stroke: "var(--aurora-400)", strokeDasharray: "6 5", strokeWidth: 1.25, opacity: 0.7 },
      })),
    ];
    return { nodes: flowNodes, edges: flowEdges };
  }, [lessons, prerequisites, outline, currentId]);

  return (
    <div className="relative h-[calc(100svh-3.5rem)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => onOpen(node.id)}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        colorMode={colorMode}
        className="!bg-night-950"
      >
        <Background color="var(--night-800)" gap={28} size={1.5} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      <div className="pointer-events-none absolute top-4 left-4 rounded-xl border border-night-800 bg-night-900/90 px-4 py-3 text-xs text-star-400 backdrop-blur">
        <p className="mb-2 font-mono text-[10px] tracking-[0.14em] uppercase">Reading the map</p>
        <p className="flex items-center gap-2">
          <span className="h-px w-6 bg-edge" /> part of
        </p>
        <p className="mt-1 flex items-center gap-2">
          <span className="w-6 border-t border-dashed border-aurora-400" /> builds on
        </p>
        <p className="mt-1 flex items-center gap-2">
          <CircleCheck className="size-3 text-gold-400" /> completed
        </p>
      </div>
    </div>
  );
}
