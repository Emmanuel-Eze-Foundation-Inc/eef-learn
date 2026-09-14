"use client";

import { Line, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Vector3, type Group } from "three";

import { layoutNodes, type GraphEdge, type GraphNode } from "./map-graph";

export const TRAVEL_COLORS = {
  mastered: "#f2c14e",
  in_progress: "#34d98c",
  available: "#8fa89a",
  locked: "#16281f",
  edgeTraveled: "#f2c14e",
  edgeAhead: "#34d98c",
  label: "#edf5ee",
  labelDim: "#8fa89a",
  sky: "#06100c",
};

export function to3d(p: { x: number; y: number }, order: number): [number, number, number] {
  const z = Math.sin(order * 2.399) * 1.6;
  return [(p.x - 90) / 55, -(p.y - 200) / 55, z];
}

export type Waypoint = {
  look: Vector3;
  cam: Vector3;
};

export function buildWaypoints(nodes: GraphNode[]): Waypoint[] {
  const flat = layoutNodes(nodes);
  const pts = nodes.map((n) => new Vector3(...to3d(flat.get(n.id)!, n.order)));
  return pts.map((look, i) => {
    const prev = pts[i - 1] ?? look.clone().add(new Vector3(-2.4, -0.4, 1.2));
    const dir = look.clone().sub(prev);
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
    dir.normalize();
    const cam = look.clone().sub(dir.multiplyScalar(3.4)).add(new Vector3(0, 0.55, 1.15));
    return { look, cam };
  });
}

export function poseAt(progress: number, waypoints: Waypoint[]): { cam: Vector3; look: Vector3 } {
  if (waypoints.length === 0) {
    return { cam: new Vector3(0, 0, 8), look: new Vector3(0, 0, 0) };
  }
  const max = waypoints.length - 1;
  const t = Math.min(Math.max(progress, 0), max);
  const i = Math.min(Math.floor(t), max - 1 >= 0 ? max - 1 : 0);
  const frac = max === 0 ? 0 : t - i;
  const a = waypoints[i];
  const b = waypoints[Math.min(i + 1, max)];
  const eased = frac * frac * (3 - 2 * frac); // smoothstep — on-path travel
  return {
    cam: a.cam.clone().lerp(b.cam, eased),
    look: a.look.clone().lerp(b.look, eased),
  };
}

function CameraRig({
  progressRef,
  waypoints,
  reducedMotion,
}: {
  progressRef: React.MutableRefObject<number>;
  waypoints: Waypoint[];
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const look = useRef(new Vector3());
  const seeded = useRef(false);

  useFrame((_, dt) => {
    const target = poseAt(progressRef.current, waypoints);
    if (!seeded.current) {
      camera.position.copy(target.cam);
      look.current.copy(target.look);
      camera.lookAt(look.current);
      seeded.current = true;
      return;
    }
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 5.2);
    camera.position.lerp(target.cam, k);
    look.current.lerp(target.look, k);
    camera.lookAt(look.current);
  });
  return null;
}

function Star({
  node,
  position,
  index,
  progressRef,
  reducedMotion,
}: {
  node: GraphNode;
  position: [number, number, number];
  index: number;
  progressRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const color = TRAVEL_COLORS[node.state];
  const baseGlow = node.state === "mastered" ? 1.3 : node.state === "in_progress" ? 0.8 : 0.28;

  useFrame(() => {
    if (!group.current) return;
    const active = Math.abs(progressRef.current - index) < 0.45;
    const scale = active ? 1.55 : 1;
    group.current.scale.lerp(new Vector3(scale, scale, scale), 0.12);
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={baseGlow} />
      </mesh>
      {node.state === "in_progress" && !reducedMotion && <PulseRing color={TRAVEL_COLORS.in_progress} />}
      <Text
        position={[0, -0.42, 0]}
        fontSize={0.16}
        color={node.state === "locked" ? TRAVEL_COLORS.labelDim : TRAVEL_COLORS.label}
        anchorX="center"
        anchorY="top"
        maxWidth={2.6}
        textAlign="center"
      >
        {node.title}
      </Text>
    </group>
  );
}

function PulseRing({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime % 2.2) / 2.2;
    ref.current.scale.setScalar(1 + t * 1.1);
    ref.current.children.forEach((c) => {
      const mesh = c as { material?: { opacity?: number } };
      if (mesh.material) mesh.material.opacity = 0.55 * (1 - t);
    });
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.016, 8, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Backdrop() {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 180; i++) {
      const a = i * 2.399963;
      const r = 7 + (i % 19);
      arr.push([Math.cos(a) * r, Math.sin(a * 1.7) * (r * 0.45), -5 - (i % 11)]);
    }
    return arr;
  }, []);
  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color="#8fa89a" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({
  nodes,
  edges,
  progressRef,
  reducedMotion,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  progressRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const pos = useMemo(() => {
    const flat = layoutNodes(nodes);
    const byId = new Map<string, [number, number, number]>();
    for (const n of nodes) byId.set(n.id, to3d(flat.get(n.id)!, n.order));
    return byId;
  }, [nodes]);
  const waypoints = useMemo(() => buildWaypoints(nodes), [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <>
      <color attach="background" args={[TRAVEL_COLORS.sky]} />
      <fog attach="fog" args={[new Color(TRAVEL_COLORS.sky), 10, 28]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 7, 9]} intensity={70} color="#edf5ee" />
      <pointLight position={[-6, 2, 4]} intensity={18} color="#34d98c" />
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
            color={traveled ? TRAVEL_COLORS.edgeTraveled : TRAVEL_COLORS.edgeAhead}
            lineWidth={traveled ? 2.8 : 1.4}
            dashed={!traveled}
            dashSize={0.12}
            gapSize={0.1}
            transparent
            opacity={traveled ? 0.95 : 0.55}
          />
        );
      })}
      {nodes.map((n, i) => (
        <Star
          key={n.id}
          node={n}
          index={i}
          position={pos.get(n.id)!}
          progressRef={progressRef}
          reducedMotion={reducedMotion}
        />
      ))}
      <CameraRig progressRef={progressRef} waypoints={waypoints} reducedMotion={reducedMotion} />
    </>
  );
}

/** Full-viewport 3D path. The page is the map; scroll is owned by TravelWorld. */
export default function TravelScene({
  nodes,
  edges,
  progressRef,
  onContextLost,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  progressRef: React.MutableRefObject<number>;
  onContextLost?: () => void;
}) {
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const first = nodes[0];
  const start = first
    ? to3d(layoutNodes(nodes).get(first.id)!, first.order)
    : ([0, 0, 0] as [number, number, number]);

  return (
    <Canvas
      className="absolute inset-0 !h-full !w-full"
      style={{ width: "100%", height: "100%" }}
      camera={{ position: [start[0], start[1] + 0.6, start[2] + 4.5], fov: 48, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.setClearColor("#06100c");
        gl.domElement.addEventListener("webglcontextlost", () => onContextLost?.());
      }}
    >
      <Scene nodes={nodes} edges={edges} progressRef={progressRef} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
