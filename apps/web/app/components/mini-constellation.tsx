import type { PublicMapEdge, PublicMapNode } from "@/lib/public-maps";

const VIEW_W = 420;
const VIEW_H = 236;

function unit(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function clip(title: string, max: number) {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Unique sky window for one published map: real nodes, real edges, unique scatter. */
export function MiniConstellation({
  slug,
  nodes,
  edges,
  active = false,
}: {
  slug: string;
  nodes: PublicMapNode[];
  edges: PublicMapEdge[];
  active?: boolean;
}) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) {
    return <div className="h-full w-full bg-night-950" />;
  }

  const n = sorted.length;
  const cx = VIEW_W / 2;
  const cy = VIEW_H * 0.5;
  const spread = Math.PI * (0.48 + unit(slug, 1) * 0.22);
  const start = Math.PI + (Math.PI - spread) / 2 + (unit(slug, 2) - 0.5) * 0.16;
  const rx = 108 + unit(slug, 3) * 36;
  const ry = 42 + unit(slug, 4) * 22;

  const pos = new Map<string, { x: number; y: number }>();
  sorted.forEach((node, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = start + t * spread;
    const jx = (unit(node.id, 7) - 0.5) * 22;
    const jy = (unit(node.id, 11) - 0.5) * 20;
    pos.set(node.id, {
      x: clamp(cx + Math.cos(a) * rx + jx, 56, VIEW_W - 56),
      y: clamp(cy + Math.sin(a) * ry + jy, 52, VIEW_H - 48),
    });
  });

  const links: PublicMapEdge[] =
    edges.length > 0
      ? edges
      : sorted.slice(1).map((node, i) => ({ fromId: sorted[i].id, toId: node.id }));

  const nebulaX = 80 + unit(slug, 13) * 260;
  const nebulaY = 48 + unit(slug, 17) * 110;
  const skyId = `nebula-${slug.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label={`${n} star path`}
    >
      <defs>
        <radialGradient id={skyId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--aurora-400)" stopOpacity={active ? 0.28 : 0.16} />
          <stop offset="55%" stopColor="var(--gold-400)" stopOpacity={active ? 0.1 : 0.05} />
          <stop offset="100%" stopColor="var(--night-950)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={nebulaX} cy={nebulaY} r={110} fill={`url(#${skyId})`} />
      {Array.from({ length: 14 }, (_, i) => (
        <circle
          key={`dust-${i}`}
          cx={18 + unit(slug, 20 + i) * (VIEW_W - 36)}
          cy={14 + unit(slug, 40 + i) * (VIEW_H - 28)}
          r={unit(slug, 60 + i) > 0.7 ? 1.35 : 0.7}
          className="fill-star-400"
          opacity={0.22 + unit(slug, 80 + i) * 0.35}
        />
      ))}
      {links.map((edge) => {
        const a = pos.get(edge.fromId);
        const b = pos.get(edge.toId);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2 + (unit(edge.fromId, 3) - 0.5) * 16;
        const my = (a.y + b.y) / 2 - 14 - unit(edge.toId, 5) * 10;
        return (
          <path
            key={`${edge.fromId}-${edge.toId}`}
            d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
            fill="none"
            className={active ? "stroke-aurora-400" : "stroke-star-400"}
            strokeOpacity={active ? 0.85 : 0.38}
            strokeWidth={active ? 1.8 : 1.25}
          />
        );
      })}
      {sorted.map((node, i) => {
        const p = pos.get(node.id);
        if (!p) return null;
        const current = i === 0;
        const last = i === n - 1 && n > 1;
        return (
          <g key={node.id}>
            {current && (
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                className="stroke-aurora-400"
                strokeWidth={1.1}
                fill="none"
                opacity={0.55}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={current ? 6.5 : 5}
              className={current ? "fill-aurora-400" : "fill-night-950 stroke-star-100"}
              strokeWidth={current ? 0 : 1.5}
            />
            {(current || last) && (
              <text
                x={p.x}
                y={p.y + 22}
                textAnchor="middle"
                className="fill-star-100"
                fontSize={11}
                fontWeight={600}
              >
                {clip(node.title, 20)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
