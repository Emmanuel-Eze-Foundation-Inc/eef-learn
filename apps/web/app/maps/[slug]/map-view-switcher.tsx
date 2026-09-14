"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { GraphEdge, GraphNode } from "./map-graph";

const Map3D = dynamic(() => import("./map-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-night-800 bg-night-900 text-star-400">
      Lighting the constellation…
    </div>
  ),
});

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * 3D/2D switcher (ticket T9, gate UC-3): 3D is the default experience, the 2D
 * map is a first-class equal — auto-selected for reduced-motion or no-WebGL,
 * and remembered per user in localStorage.
 */
export function MapViewSwitcher({
  mapSlug,
  nodes,
  edges,
  map2d,
}: {
  mapSlug: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  map2d: React.ReactNode;
}) {
  const [mode, setMode] = useState<"2d" | "3d" | null>(null);

  useEffect(() => {
    // mode depends on localStorage/matchMedia/WebGL — client-only values that
    // must be resolved after hydration, hence the one-time setState here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(() => {
      const saved = localStorage.getItem("eef-map-view");
      if (saved === "2d" || saved === "3d") return saved;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return !reduced && webglAvailable() ? "3d" : "2d";
    });
  }, []);

  function choose(next: "2d" | "3d") {
    localStorage.setItem("eef-map-view", next);
    setMode(next);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 rounded-full border border-night-800 bg-night-900 p-1 text-sm w-fit" role="group" aria-label="Map view mode">
        {(["3d", "2d"] as const).map((m) => (
          <button
            key={m}
            onClick={() => choose(m)}
            aria-pressed={mode === m}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              mode === m ? "bg-aurora-400 text-ink-900" : "text-star-400 hover:text-star-100"
            }`}
          >
            {m === "3d" ? "3D constellation" : "2D map"}
          </button>
        ))}
      </div>
      {mode === "3d" ? (
        <Map3D
          mapSlug={mapSlug}
          nodes={nodes}
          edges={edges}
          onContextLost={() => setMode("2d")}
        />
      ) : (
        map2d
      )}
    </div>
  );
}
