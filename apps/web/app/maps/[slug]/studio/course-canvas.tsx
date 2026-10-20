"use client";

import {
  Background,
  Controls,
  getSmoothStepPath,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type ConnectionLineComponentProps,
  type Edge,
  type NodeChange,
  type OnConnectEnd,
  type OnConnectStart,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LayoutGrid, Maximize, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useResolvedTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { buildOutline, type CourseLesson, type CourseOutline } from "@/lib/course-model";

import { CourseNode, type CourseFlowNode } from "./course-node";
import type { StudioEdge } from "./studio-graph";
import type { MapActions } from "./use-map-actions";

const nodeTypes = { lesson: CourseNode };

const CARD_W = 240;
const CARD_H = 64;
/** a dropped card sits centred under the pointer, top edge just above it */
const DROP_OFFSET = { x: CARD_W / 2, y: 12 };

/** What the + under a card adds, and where it goes. */
function addTarget(outline: CourseOutline, lesson: CourseLesson): { label: string; parentId: string | null } {
  if (outline.intro?.id === lesson.id) return { label: "Module", parentId: lesson.id };
  if (outline.modules.some((m) => m.head.id === lesson.id)) return { label: "Lesson", parentId: lesson.id };
  return { label: "Lesson", parentId: lesson.parentId };
}

function toFlow(
  lessons: CourseLesson[],
  edges: StudioEdge[],
  selectedId: string | null,
  addChild: (parentId: string | null) => void,
): { nodes: CourseFlowNode[]; edges: Edge[] } {
  const outline = buildOutline(lessons);
  const kicker = new Map<string, string>(outline.modules.map((m, i) => [m.head.id, `Module ${i + 1}`]));
  if (outline.intro) kicker.set(outline.intro.id, "Start here");

  const nodes: CourseFlowNode[] = lessons.map((lesson) => {
    const target = addTarget(outline, lesson);
    return {
      id: lesson.id,
      type: "lesson",
      position: { x: lesson.positionX, y: lesson.positionY },
      data: {
        title: lesson.title,
        kicker: kicker.get(lesson.id) ?? null,
        leadType: lesson.blocks[0]?.type ?? null,
        beatCount: lesson.blocks.length,
        selected: lesson.id === selectedId,
        addLabel: target.label,
        onAdd: () => addChild(target.parentId),
      },
      selected: lesson.id === selectedId,
    };
  });

  const flowEdges: Edge[] = [
    ...lessons
      .filter((l) => l.parentId)
      .map((l) => ({
        id: `contains:${l.parentId}->${l.id}`,
        source: l.parentId!,
        target: l.id,
        sourceHandle: "spine-source",
        targetHandle: "spine-target",
        type: "smoothstep",
        pathOptions: { offset: 18, borderRadius: 10 },
        style: { stroke: "color-mix(in oklab, var(--star-400) 55%, transparent)", strokeWidth: 1.5 },
        data: { kind: "contains" },
      })),
    ...edges.map((e) => ({
      id: `prereq:${e.fromId}->${e.toId}`,
      source: e.fromId,
      target: e.toId,
      sourceHandle: "prereq-source",
      targetHandle: "prereq-target",
      type: "smoothstep",
      animated: true,
      style: { stroke: "var(--aurora-400)", strokeWidth: 1.4, strokeDasharray: "6 5", opacity: 0.8 },
      data: { kind: "prerequisite" },
    })),
  ];
  return { nodes, edges: flowEdges };
}

/** While drawing from a node, preview the lesson that letting go on empty canvas will create. */
function DrawLine({ fromX, fromY, toX, toY, fromPosition, toPosition, fromHandle, connectionStatus }: ConnectionLineComponentProps) {
  const isPrereq = fromHandle?.id?.startsWith("prereq") ?? false;
  const [path] = getSmoothStepPath({ sourceX: fromX, sourceY: fromY, sourcePosition: fromPosition, targetX: toX, targetY: toY, targetPosition: toPosition, borderRadius: 10 });
  const overHandle = connectionStatus !== null;
  const stroke = isPrereq ? "var(--aurora-400)" : "color-mix(in oklab, var(--star-400) 75%, transparent)";
  const creates = fromHandle?.id?.endsWith("-source") ?? false;
  return (
    <g>
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.6} strokeDasharray={isPrereq ? "6 5" : undefined} />
      {creates && !overHandle ? (
        <g transform={`translate(${toX - DROP_OFFSET.x}, ${toY - DROP_OFFSET.y})`} className="pointer-events-none">
          <rect
            width={CARD_W}
            height={CARD_H - 8}
            rx={16}
            fill="color-mix(in oklab, var(--night-900) 88%, transparent)"
            stroke="var(--aurora-400)"
            strokeDasharray="5 4"
            strokeWidth={1.2}
          />
          <text x={16} y={24} fill="var(--star-100)" fontSize={13} fontWeight={600}>
            New lesson
          </text>
          <text x={16} y={41} fill="var(--star-400)" fontSize={10} letterSpacing={1.2}>
            {isPrereq ? "BUILDS ON THIS · LET GO TO ADD" : "INSIDE THIS · LET GO TO ADD"}
          </text>
        </g>
      ) : null}
      {overHandle ? <circle cx={toX} cy={toY} r={5} fill="var(--aurora-400)" /> : null}
    </g>
  );
}

type CanvasProps = {
  lessons: CourseLesson[];
  edges: StudioEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  actions: MapActions;
  /** opens the delete confirmation; nothing is deleted without it */
  onRequestDelete: (id: string) => void;
};

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

const noSubscribe = () => () => undefined;
const modKey = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+");

function CanvasInner({ lessons, edges, selectedId, onSelect, actions, onRequestDelete }: CanvasProps) {
  const colorMode = useResolvedTheme();
  const { addChild } = actions;
  const addChildRef = useRef(addChild);
  useEffect(() => {
    addChildRef.current = addChild;
  }, [addChild]);
  const [flow, setFlow] = useState(() => toFlow(lessons, edges, selectedId, (p) => void addChild(p)));
  /** cards glide between positions once the first layout has settled */
  const [glide, setGlide] = useState(false);
  const connectFrom = useRef<{ nodeId: string; handle: string | null } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, flowToScreenPosition, fitView, setCenter, getZoom } = useReactFlow();

  useEffect(() => {
    // The course is the source of truth; re-derive the canvas whenever it changes.
    setFlow(toFlow(lessons, edges, selectedId, (p) => void addChildRef.current(p)));
  }, [lessons, edges, selectedId]);

  const { undo, redo } = actions;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        void redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Bring a newly added or selected card into view without changing the zoom.
  const selectedLesson = lessons.find((l) => l.id === selectedId) ?? null;
  const selX = selectedLesson?.positionX;
  const selY = selectedLesson?.positionY;
  useEffect(() => {
    const box = wrapper.current?.getBoundingClientRect();
    if (selX === undefined || selY === undefined || !box) return;
    const topLeft = flowToScreenPosition({ x: selX, y: selY });
    const bottomRight = flowToScreenPosition({ x: selX + CARD_W, y: selY + CARD_H + 40 });
    const inside =
      topLeft.x >= box.left + 16 && topLeft.y >= box.top + 56 && bottomRight.x <= box.right - 16 && bottomRight.y <= box.bottom - 16;
    if (!inside) void setCenter(selX + CARD_W / 2, selY + CARD_H / 2, { zoom: getZoom(), duration: 350 });
  }, [selX, selY, flowToScreenPosition, setCenter, getZoom]);

  const onConnectStart: OnConnectStart = useCallback((_e, params) => {
    connectFrom.current = { nodeId: params.nodeId ?? "", handle: params.handleId ?? null };
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      if (c.sourceHandle?.startsWith("prereq") || c.targetHandle?.startsWith("prereq")) void actions.toggleLink(c.source, c.target);
      else void actions.nest(c.target, c.source);
    },
    [actions],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, state) => {
      const from = connectFrom.current;
      connectFrom.current = null;
      if (!from?.nodeId || !from.handle?.endsWith("-source") || state.isValid) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest(".react-flow__node")) return;
      const point =
        "changedTouches" in event
          ? { x: event.changedTouches[0]!.clientX, y: event.changedTouches[0]!.clientY }
          : { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
      const pos = screenToFlowPosition(point);
      const x = pos.x - DROP_OFFSET.x;
      const y = pos.y - DROP_OFFSET.y;
      if (from.handle.startsWith("prereq")) void actions.addAfter(from.nodeId, x, y);
      else void actions.add({ title: "New lesson", parentId: from.nodeId, positionX: x, positionY: y });
    },
    [actions, screenToFlowPosition],
  );

  const onNodesChange = useCallback((changes: NodeChange<CourseFlowNode>[]) => {
    setFlow((current) => {
      let nodes = current.nodes;
      for (const change of changes) {
        switch (change.type) {
          case "position": {
            const pos = change.position;
            if (pos) nodes = nodes.map((n) => (n.id === change.id ? { ...n, position: pos } : n));
            break;
          }
          case "select":
          case "add":
          case "remove":
          case "replace":
          case "dimensions":
            break;
          default: {
            const _exhaustive: never = change;
            return _exhaustive;
          }
        }
      }
      return { ...current, nodes };
    });
  }, []);

  const outline = buildOutline(lessons);
  const lessonTarget = selectedLesson && outline.intro?.id !== selectedLesson.id ? addTarget(outline, selectedLesson) : null;
  const firstModule = outline.modules[0]?.head ?? null;
  const { canUndo, canRedo } = actions.history;
  const mod = useSyncExternalStore(noSubscribe, modKey, () => "⌘");

  return (
    <div ref={wrapper} className="relative h-full min-h-0">
      <ReactFlow
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        colorMode={colorMode}
        className={glide ? "eef-glide" : undefined}
        onInit={() => window.setTimeout(() => setGlide(true), 400)}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) => void actions.move(node.id, node.position.x, node.position.y)}
        onEdgesChange={(changes) => {
          for (const change of changes) {
            if (change.type !== "remove") continue;
            const edge = flow.edges.find((e) => e.id === change.id);
            if (!edge) continue;
            void actions.unlink(edge.data?.kind === "contains" ? "contains" : "prerequisite", edge.source, edge.target);
          }
        }}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        connectionLineComponent={DrawLine}
        deleteKeyCode={["Backspace", "Delete"]}
        onBeforeDelete={async ({ nodes, edges: doomed }) => {
          const node = nodes[0];
          if (node) onRequestDelete(node.id);
          return { nodes: [], edges: node ? [] : doomed };
        }}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        panOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        panOnDrag
        connectionRadius={36}
        minZoom={0.3}
        maxZoom={1.6}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} color="color-mix(in oklab, var(--star-400) 22%, transparent)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-2xl border border-night-800 bg-night-900/90 p-1 shadow-[0_12px_32px_var(--shadow-soft)] backdrop-blur-md">
          <Button type="button" variant="ghost" size="icon-xs" disabled={!canUndo} onClick={() => void undo()} title={`Undo (${mod}Z)`} aria-label="Undo">
            <Undo2 className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" disabled={!canRedo} onClick={() => void redo()} title={`Redo (${mod}⇧Z)`} aria-label="Redo">
            <Redo2 className="size-3.5" />
          </Button>
          <span className="mx-1 h-4 w-px bg-night-800" />
          <Button type="button" variant="ghost" size="xs" onClick={() => void addChild(outline.intro?.id ?? null)}>
            <Plus className="size-3.5" /> Module
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={!lessonTarget && !firstModule}
            title={lessonTarget ? "Add a lesson to the selected module" : "Add a lesson to the first module"}
            onClick={() => void addChild(lessonTarget?.parentId ?? firstModule?.id ?? null)}
          >
            <Plus className="size-3.5" /> Lesson
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!selectedLesson}
            onClick={() => selectedLesson && onRequestDelete(selectedLesson.id)}
            title="Delete the selected lesson or module (Delete)"
            aria-label="Delete selected"
            className="hover:text-ember-300"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <span className="mx-1 h-4 w-px bg-night-800" />
          <Button type="button" variant="ghost" size="xs" onClick={() => void actions.arrange()}>
            <LayoutGrid className="size-3.5" /> <span className="sm:hidden">Arrange</span>
            <span className="max-sm:hidden">Auto-arrange</span>
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => void fitView({ padding: 0.2, duration: 300 })}>
            <Maximize className="size-3.5" /> <span className="max-sm:sr-only">Fit</span>
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-xl border border-night-800 bg-night-900/90 px-3 py-2 text-[11px] text-star-400 backdrop-blur-md md:block">
        <p className="flex items-center gap-2">
          <span className="h-px w-5 bg-star-400/60" /> part of · draw from the bottom dot
        </p>
        <p className="mt-1 flex items-center gap-2">
          <span className="h-px w-5 border-t border-dashed border-aurora-400" /> builds on · draw from the right dot
        </p>
        <p className="mt-1">Let go on empty space to add a lesson · {mod}Z undo</p>
      </div>
    </div>
  );
}

export function CourseCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
