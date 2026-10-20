"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Circle, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { blockMeta, isBlockType } from "@/lib/blocks";
import { cn } from "@/lib/utils";

export type CourseNodeData = {
  title: string;
  /** "Module 2", "Start here", or null for a lesson */
  kicker: string | null;
  leadType: string | null;
  beatCount: number;
  selected: boolean;
  /** "Lesson" or "Module": what the + under the card adds */
  addLabel: string;
  onAdd: () => void;
};

export type CourseFlowNode = Node<CourseNodeData, "lesson">;

const hidden = "!pointer-events-none !opacity-0";

export function CourseNode({ data, selected }: NodeProps<CourseFlowNode>) {
  const meta = data.leadType && isBlockType(data.leadType) ? blockMeta(data.leadType) : null;
  const Icon = meta?.icon ?? Circle;
  const isModule = data.kicker !== null;
  const still = useReducedMotion();
  return (
    <motion.div
      initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group/node relative w-60 rounded-2xl border bg-night-900 px-3 py-3 shadow-[0_12px_40px_var(--shadow-soft)] transition-colors",
        selected ? "border-aurora-400 ring-4 ring-aurora-400/15" : "border-night-800 hover:border-star-400/50",
        isModule && !selected && "border-star-400/25",
      )}
    >
      <Handle id="spine-target" type="target" position={Position.Left} className={hidden} isConnectable={false} />
      <Handle id="spine-source" type="source" position={Position.Left} className={hidden} isConnectable={false} />
      <Handle id="contains-target" type="target" position={Position.Top} className="eef-handle" />
      <Handle id="prereq-target" type="target" position={Position.Left} className="eef-handle" />
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg bg-night-800",
            selected ? "text-aurora-400" : "text-star-400",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {data.kicker ? (
            <p className="font-mono text-[9px] tracking-[0.14em] text-aurora-400/80 uppercase">{data.kicker}</p>
          ) : null}
          <p className="line-clamp-2 text-sm leading-snug font-semibold text-star-100">{data.title}</p>
          <p className="mt-0.5 font-mono text-[9px] tracking-[0.12em] text-star-400 uppercase">
            {data.beatCount === 0
              ? "Empty"
              : `${data.beatCount} part${data.beatCount === 1 ? "" : "s"} · ${meta?.label ?? "Lesson"}`}
          </p>
        </div>
      </div>
      <Handle id="contains-source" type="source" position={Position.Bottom} className="eef-handle" />
      <Handle id="prereq-source" type="source" position={Position.Right} className="eef-handle" />
      <div
        className={cn(
          "absolute inset-x-0 top-full flex justify-center pt-3 transition-[opacity,translate] duration-150",
          selected ? "opacity-100" : "pointer-events-none translate-y-[-4px] opacity-0 group-hover/node:pointer-events-auto group-hover/node:translate-y-0 group-hover/node:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAdd();
          }}
          className="nodrag nopan inline-flex h-6 items-center gap-1 rounded-full border border-aurora-400/40 bg-night-950 px-2.5 text-[11px] font-medium text-aurora-400 shadow-[0_6px_18px_var(--shadow-strong)] hover:border-aurora-400 hover:bg-night-900"
        >
          <Plus className="size-3" /> {data.addLabel}
        </button>
      </div>
    </motion.div>
  );
}
