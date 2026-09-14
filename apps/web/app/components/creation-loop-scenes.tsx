"use client";

import { ReadOnCue } from "../maps/[slug]/read-on-cue";
import { blockKindLabel } from "../maps/[slug]/content-media";

const KINDS = ["youtube", "blog", "ai_text", "flashcard", "quiz"] as const;

const DEMO_NODES = [
  { id: "a", title: "Foundations", x: 48, y: 88, depth: 0 },
  { id: "b", title: "Core ideas", x: 168, y: 72, depth: 0 },
  { id: "b1", title: "Watch", x: 148, y: 148, depth: 1 },
  { id: "b2", title: "Try it", x: 208, y: 148, depth: 1 },
  { id: "c", title: "Practice", x: 288, y: 96, depth: 0 },
] as const;

function StagePlate({
  label,
  title,
  current = false,
}: {
  label: string;
  title: string;
  current?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[7.5rem] flex-col justify-between rounded-2xl border px-3 py-3 ${
        current
          ? "min-w-0 flex-[1.35] border-aurora-400/50 bg-night-900 shadow-[0_0_28px_rgba(52,217,140,0.18)]"
          : "min-w-0 flex-1 border-night-800 bg-night-950/80 opacity-55"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-star-400">{label}</p>
      <p className={`text-sm font-semibold ${current ? "text-star-100" : "text-star-400"}`}>{title}</p>
    </div>
  );
}

function SceneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-night-800 bg-night-900/80 p-5 motion-safe:animate-[arrive_240ms_var(--ease-out)_both]">
      {children}
    </div>
  );
}

function TopicScene() {
  return (
    <SceneShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">Name it</p>
      <div className="mt-4 rounded-2xl border border-night-800 bg-night-950 px-4 py-3 text-sm text-star-400">
        watercolor painting
      </div>
      <p className="mt-4 text-sm text-star-400">or open a community map</p>
    </SceneShell>
  );
}

function KeyScene() {
  return (
    <SceneShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">Ask, then answer</p>
      <div className="mt-4 rounded-2xl border border-night-800 bg-night-950 px-4 py-3 font-mono text-sm text-star-400">
        sk-or-••••••••
      </div>
      <p className="mt-5 text-sm font-semibold">Who is this for?</p>
      <p className="mt-2 text-sm text-star-400">Just me. I have never held a brush.</p>
    </SceneShell>
  );
}

function GraphScene() {
  return (
    <SceneShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">Shape the path</p>
      <svg viewBox="0 0 336 200" className="mt-3 w-full" aria-hidden="true">
        <line x1="48" y1="88" x2="168" y2="72" stroke="var(--star-400)" strokeOpacity="0.45" strokeDasharray="5 6" />
        <line x1="208" y1="148" x2="288" y2="96" stroke="var(--star-400)" strokeOpacity="0.45" strokeDasharray="5 6" />
        <line x1="168" y1="72" x2="148" y2="148" stroke="var(--aurora-400)" strokeOpacity="0.55" />
        <line x1="168" y1="72" x2="208" y2="148" stroke="var(--aurora-400)" strokeOpacity="0.55" />
        {DEMO_NODES.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.depth ? 8 : 12}
              fill="var(--night-950)"
              stroke={n.id === "b" ? "var(--aurora-400)" : "var(--star-400)"}
              strokeWidth={n.id === "b" ? 2.5 : 1.5}
            />
            <text
              x={n.x}
              y={n.y + (n.depth ? 22 : 28)}
              textAnchor="middle"
              fill="var(--star-100)"
              fontSize={10}
            >
              {n.title}
            </text>
          </g>
        ))}
      </svg>
    </SceneShell>
  );
}

function BeatScene() {
  return (
    <SceneShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">Fill the beat</p>
      <p className="mt-3 text-sm font-semibold">Core ideas · Watch</p>
      <p className="mt-2 text-sm leading-relaxed text-star-400">
        A clip, a page, the idea, a card, a check. Each lesson names its source.
      </p>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-star-400">
        {KINDS.map((kind) => blockKindLabel(kind)).join(" · ")}
      </p>
    </SceneShell>
  );
}

function LaunchScene() {
  return (
    <SceneShell>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-aurora-400">Launch, then enter</p>
      <div className="mt-4 flex items-stretch gap-2">
        <StagePlate label="Previous" title="The lesson behind you" />
        <StagePlate label="You are here" title="This beat" current />
        <StagePlate label="Next" title="The lesson ahead" />
      </div>
      <div className="mt-5 flex justify-center">
        <ReadOnCue direction="down" mode="leave" />
      </div>
    </SceneShell>
  );
}

/** Shared create → nest → launch vignettes for HowPath and the wizard. */
export function CreationLoopScenes({ step }: { step: number }) {
  const i = ((step % 5) + 5) % 5;
  switch (i) {
    case 0:
      return <TopicScene />;
    case 1:
      return <KeyScene />;
    case 2:
      return <GraphScene />;
    case 3:
      return <BeatScene />;
    case 4:
      return <LaunchScene />;
    default: {
      const _never: never = i as never;
      return _never;
    }
  }
}
