"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { PublicMap, PublicMapEdge } from "@/lib/public-maps";

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

function slugOf(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest("[data-map-slug]")?.getAttribute("data-map-slug") ?? null;
}

/** Spine sits in the right-hand wake, clear of the topic field. */
function alongWake(t: number) {
  const p0 = { x: 655, y: 455 };
  const p1 = { x: 790, y: 355 };
  const p2 = { x: 950, y: 215 };
  const p3 = { x: 1095, y: 118 };
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** One published map as a short journey of real nodes, not a generic blob. */
function clusterPoints(map: PublicMap, origin: { x: number; y: number }, scale: number) {
  const sorted = [...map.nodes].sort((a, b) => a.order - b.order);
  const n = sorted.length;
  const spread = Math.PI * (0.52 + unit(map.slug, 1) * 0.2);
  const start = Math.PI + (Math.PI - spread) / 2 + (unit(map.slug, 2) - 0.5) * 0.12;
  const rx = (48 + unit(map.slug, 3) * 18) * scale;
  const ry = (20 + unit(map.slug, 4) * 10) * scale;
  const pos = new Map<string, { x: number; y: number }>();
  sorted.forEach((node, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = start + t * spread;
    pos.set(node.id, {
      x: origin.x + Math.cos(a) * rx + (unit(node.id, 7) - 0.5) * 10,
      y: origin.y + Math.sin(a) * ry + (unit(node.id, 11) - 0.5) * 8,
    });
  });
  const links: PublicMapEdge[] =
    map.edges.length > 0
      ? map.edges
      : sorted.slice(1).map((node, i) => ({ fromId: sorted[i].id, toId: node.id }));
  return { sorted, pos, links, hitR: Math.max(rx, 52) };
}

/** Real published maps as node paths along the wake. */
export function WakeAtlasSky({ maps }: { maps: PublicMap[] }) {
  const [hot, setHot] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const spineId = `wake-spine-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    function inSky(target: EventTarget | null) {
      return target instanceof Node && !!svgRef.current?.contains(target);
    }

    function open(slug: string) {
      setHot(slug);
      document.getElementById(`map-${slug}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    function onClick(e: MouseEvent) {
      if (!inSky(e.target)) return;
      const slug = slugOf(e.target);
      if (slug) open(slug);
    }

    function onOver(e: MouseEvent) {
      if (!inSky(e.target)) return;
      const slug = slugOf(e.target);
      if (slug) setHot(slug);
    }

    function onOut(e: MouseEvent) {
      if (!inSky(e.target)) return;
      const from = slugOf(e.target);
      const to = slugOf(e.relatedTarget);
      if (from && from !== to) {
        setHot((current) => (current === from ? null : current));
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (!inSky(e.target)) return;
      const slug = slugOf(e.target);
      if (!slug) return;
      e.preventDefault();
      open(slug);
    }

    document.addEventListener("click", onClick);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (maps.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1200 720"
      className="absolute inset-0 z-[2] hidden h-full w-full lg:block"
      role="img"
      aria-label="Published maps as constellations along the wake"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={spineId} x1="20%" y1="80%" x2="85%" y2="18%">
          <stop offset="0%" stopColor="var(--gold-400)" stopOpacity="0.55" />
          <stop offset="45%" stopColor="var(--aurora-400)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6ee7f9" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path
        d="M 655 455 C 790 355, 950 215, 1095 118"
        fill="none"
        stroke={`url(#${spineId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
      />
      {maps.map((map, mi) => {
        const t = maps.length === 1 ? 0.38 : (mi / Math.max(maps.length - 1, 1)) * 0.92;
        const origin = alongWake(t);
        const featured = hot === map.slug;
        const scale = featured ? 1.35 : 1.05;
        const { sorted, pos, links, hitR } = clusterPoints(map, origin, scale);
        const titleRight = origin.x < 780;

        return (
          <g
            key={map.slug}
            data-map-slug={map.slug}
            role="link"
            tabIndex={0}
            aria-label={map.title}
            className="cursor-pointer outline-none [pointer-events:bounding-box]"
          >
            <circle cx={origin.x} cy={origin.y} r={hitR} fill="transparent" />
            <text
              x={titleRight ? origin.x + hitR * 0.2 : origin.x}
              y={origin.y - hitR * 0.55}
              textAnchor={titleRight ? "start" : "middle"}
              className={featured ? "fill-star-100" : "fill-star-400"}
              fontSize={featured ? 15 : 12}
              fontWeight={600}
            >
              {clip(map.title, featured ? 38 : 34)}
            </text>
            {links.map((edge) => {
              const a = pos.get(edge.fromId);
              const b = pos.get(edge.toId);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2 + (unit(edge.fromId, 3) - 0.5) * 10;
              const my = (a.y + b.y) / 2 - 8;
              return (
                <path
                  key={`${edge.fromId}-${edge.toId}`}
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  fill="none"
                  className={featured ? "stroke-aurora-400" : "stroke-star-400"}
                  strokeOpacity={featured ? 0.92 : 0.62}
                  strokeWidth={featured ? 1.9 : 1.45}
                />
              );
            })}
            {sorted.map((node, i) => {
              const p = pos.get(node.id);
              if (!p) return null;
              const current = featured && i === 0;
              const labeled =
                featured && (i === 0 || i === sorted.length - 1) && p.x > 720;
              return (
                <g key={node.id}>
                  {current && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={13}
                      className="stroke-aurora-400"
                      strokeWidth={1.1}
                      fill="none"
                      opacity={0.6}
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={current ? 6 : 4.6}
                    className={current ? "fill-aurora-400" : "fill-night-950 stroke-star-100"}
                    strokeWidth={current ? 0 : 1.35}
                    opacity={featured ? 1 : 0.82}
                  />
                  {labeled && (
                    <text
                      x={p.x}
                      y={p.y + 18}
                      textAnchor="middle"
                      className="fill-star-100"
                      fontSize={10}
                      fontWeight={600}
                    >
                      {clip(node.title, 16)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
