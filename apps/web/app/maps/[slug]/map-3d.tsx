"use client";

import { Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { Group } from "three";

import { layoutNodes, type GraphEdge, type GraphNode } from "./map-graph";

/**
 * 3D constellation (ticket T9, gate UC-3). Same layout as the 2D SVG lifted
 * into depth. Gold = mastered/traveled, aurora = offered, dim = locked.
 * Respects prefers-reduced-motion (no idle drift) and falls back to 2D when
 * WebGL is unavailable (handled by the switcher).
 */

const COLORS = {
  mastered: "#f2c14e",
  in_progress: "#34d98c",
  available: "#8fa89a",
  locked: "#16281f",
  edgeTraveled: "#f2c14e",
  edgeAhead: "#8fa89a",
  label: "#edf5ee",
  labelDim: "#8fa89a",
};

function to3d(p: { x: number; y: number }, order: number): [number, number, number] {
  // svg coords → centered 3D: x spread, y inverted, deterministic z depth
  const z = Math.sin(order * 2.399) * 1.6; // golden-angle-ish scatter
  return [(p.x - 90) / 60, -(p.y - 200) / 60, z];
}

function Star({
  node,
  position,
  onClick,
  reducedMotion,
}: {
  node: GraphNode;
  position: [number, number, number];
  onClick: () => void;
  reducedMotion: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = node.state !== "locked";
  const color = COLORS[node.state];
  const glow = node.state === "mastered" ? 1.2 : node.state === "in_progress" ? 0.9 : 0.35;
  return (
    <group position={position}>
      <mesh
        onClick={interactive ? onClick : undefined}
        onPointerOver={() => interactive && setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.35 : 1}
      >
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? glow * 1.6 : glow}
        />
      </mesh>
      {node.state === "in_progress" && !reducedMotion && <PulseRing />}
      <Text
        position={[0, -0.45, 0]}
        fontSize={0.17}
        color={node.state === "locked" ? COLORS.labelDim : COLORS.label}
        anchorX="center"
        anchorY="top"
        maxWidth={2.4}
        textAlign="center"
      >
        {node.title}
      </Text>
    </group>
  );
}

function PulseRing() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime % 2) / 2;
    ref.current.scale.setScalar(1 + t * 0.9);
    ref.current.children.forEach((c) => {
      const mesh = c as { material?: { opacity?: number } };
      if (mesh.material) mesh.material.opacity = 0.5 * (1 - t);
    });
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.015, 8, 48]} />
        <meshBasicMaterial color={COLORS.in_progress} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Backdrop() {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 160; i++) {
      const a = i * 2.399963;
      const r = 6 + (i % 17);
      arr.push([Math.cos(a) * r, Math.sin(a * 1.7) * (r * 0.5), -4 - (i % 9)]);
    }
    return arr;
  }, []);
  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color="#8fa89a" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Drift({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && enabled) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.06;
    }
  });
  return <group ref={ref}>{children}</group>;
}

export default function Map3D({
  mapSlug,
  nodes,
  edges,
  onContextLost,
}: {
  mapSlug: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onContextLost?: () => void;
}) {
  const router = useRouter();
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pos = useMemo(() => {
    const flat = layoutNodes(nodes);
    const byId = new Map<string, [number, number, number]>();
    for (const n of nodes) byId.set(n.id, to3d(flat.get(n.id)!, n.order));
    return byId;
  }, [nodes]);

  const center = useMemo<[number, number, number]>(() => {
    const pts = [...pos.values()];
    if (!pts.length) return [0, 0, 0];
    return [
      pts.reduce((s, p) => s + p[0], 0) / pts.length,
      pts.reduce((s, p) => s + p[1], 0) / pts.length,
      0,
    ];
  }, [pos]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="h-[480px] overflow-hidden rounded-2xl border border-night-800 bg-night-900">
      <Canvas
        camera={{ position: [center[0], center[1], 8.5], fov: 50 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          // 2D-fallback gate (UC-3): if the GPU context dies, don't strand the
          // learner on a blank box — hand control back to the switcher.
          const check = () => {
            if (gl.getContext().isContextLost()) onContextLost?.();
          };
          gl.domElement.addEventListener("webglcontextlost", () => onContextLost?.());
          setTimeout(check, 500);
        }}
      >
        <color attach="background" args={["#0b1a13"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 6, 8]} intensity={60} color="#edf5ee" />
        <Drift enabled={!reducedMotion}>
          <Backdrop />
          {edges.map((e) => {
            const a = pos.get(e.fromId);
            const b = pos.get(e.toId);
            if (!a || !b) return null;
            const traveled = byId.get(e.fromId)?.state === "mastered";
            return (
              <Line
                key={`${e.fromId}-${e.toId}`}
                points={[a, b]}
                color={traveled ? COLORS.edgeTraveled : COLORS.edgeAhead}
                lineWidth={traveled ? 2.5 : 1.2}
                dashed={!traveled}
                dashSize={0.12}
                gapSize={0.1}
                transparent
                opacity={traveled ? 0.95 : 0.45}
              />
            );
          })}
          {nodes.map((n) => (
            <Star
              key={n.id}
              node={n}
              position={pos.get(n.id)!}
              reducedMotion={reducedMotion}
              onClick={() => router.push(`/maps/${mapSlug}/${n.slug}`)}
            />
          ))}
        </Drift>
        <OrbitControls
          target={center}
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={16}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
