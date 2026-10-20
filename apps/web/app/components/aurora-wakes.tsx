"use client";

import { useEffect, useRef } from "react";

import { resolvedTheme, subscribeTheme } from "@/hooks/use-theme";
import type { Theme } from "@/lib/theme";

type Kind = "dust" | "node" | "star";

type Body = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  density: number;
  angle: number;
  velocity: number;
  kind: Kind;
};

type Spark = { x: number; y: number; life: number };

const COUNT = 64;
const LINK = 108;
const PUSH = 128;
type Palette = { gold: string; aurora: string; star: string };

/** RGB channels per theme; on paper the sky inks in instead of glowing. */
const PALETTES: Record<Theme, Palette> = {
  dark: { gold: "242, 193, 78", aurora: "52, 217, 140", star: "237, 245, 238" },
  light: { gold: "163, 118, 8", aurora: "14, 122, 85", star: "16, 32, 26" },
};

function kindFor(i: number): Kind {
  if (i % 11 === 0) return "star";
  if (i % 5 === 0) return "node";
  return "dust";
}

function northStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  const s = r / 24;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 24 * s);
  ctx.lineTo(cx + 6.45 * s, cy - 6.45 * s);
  ctx.lineTo(cx + 24 * s, cy);
  ctx.lineTo(cx + 6.45 * s, cy + 6.45 * s);
  ctx.lineTo(cx, cy + 24 * s);
  ctx.lineTo(cx - 6.45 * s, cy + 6.45 * s);
  ctx.lineTo(cx - 24 * s, cy);
  ctx.lineTo(cx - 6.45 * s, cy - 6.45 * s);
  ctx.closePath();
  ctx.fill();
}

function seed(width: number, height: number): Body[] {
  const desktop = width >= 1024;
  const bodies: Body[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    const kind = kindFor(i);
    const x =
      desktop && Math.random() < 0.72 ? Math.random() * width * 0.56 : Math.random() * width;
    const y = Math.random() * height;
    bodies.push({
      x,
      y,
      baseX: x,
      baseY: y,
      size: kind === "star" ? 5.5 + Math.random() * 2 : kind === "node" ? 1.8 + Math.random() : 0.7 + Math.random() * 1.1,
      density: 6 + Math.random() * 14,
      angle: Math.random() * Math.PI * 2,
      velocity: 0.04 + Math.random() * 0.16,
      kind,
    });
  }
  return bodies;
}

/**
 * Hero sky: a map of stars that yield around the pointer, then spring home.
 * Aurora filaments are the offered path; gold north stars are earned.
 * Pointer wakes still fade behind you. Static when reduced-motion is on.
 */
export function AuroraWakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const gfx = node.getContext("2d");
    if (!gfx) return;
    const canvas: HTMLCanvasElement = node;
    const ctx: CanvasRenderingContext2D = gfx;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const mouse = { x: -9999, y: -9999 };
    const sparks: Spark[] = [];
    let bodies: Body[] = [];
    let frame = 0;
    let last = performance.now();
    let lastSpark = { x: 0, y: 0 };
    let cssW = 0;
    let cssH = 0;
    let running = true;
    let pal = PALETTES[resolvedTheme()];

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = parent.clientWidth;
      cssH = parent.clientHeight;
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bodies = seed(cssW, cssH);
      if (reduce) paintStatic();
    }

    function paintStatic() {
      ctx.clearRect(0, 0, cssW, cssH);
      for (const b of bodies) drawBody(ctx, b, pal);
    }

    function onTheme() {
      pal = PALETTES[resolvedTheme()];
      if (reduce) paintStatic();
    }

    function onMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (fine) {
        mouse.x = x;
        mouse.y = y;
      }
      if (reduce) return;
      const dx = x - lastSpark.x;
      const dy = y - lastSpark.y;
      if (dx * dx + dy * dy < 36) return;
      lastSpark = { x, y };
      sparks.push({ x, y, life: 1 });
      if (sparks.length > 72) sparks.shift();
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function step(now: number) {
      if (!running) return;
      const dt = Math.min(32, now - last);
      last = now;
      const t = dt / 16.67;

      ctx.clearRect(0, 0, cssW, cssH);

      for (const b of bodies) {
        b.angle += b.velocity * t * 0.35;
        b.baseX += Math.sin(b.angle) * 0.12 * t;
        b.baseY += Math.cos(b.angle * 0.85) * 0.1 * t;
        if (b.baseX < 0) b.baseX = cssW;
        if (b.baseX > cssW) b.baseX = 0;
        if (b.baseY < 0) b.baseY = cssH;
        if (b.baseY > cssH) b.baseY = 0;

        const dx = mouse.x - b.x;
        const dy = mouse.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (fine && dist < PUSH && dist > 0.001) {
          const force = (PUSH - dist) / PUSH;
          b.x -= (dx / dist) * force * b.density * t * 0.55;
          b.y -= (dy / dist) * force * b.density * t * 0.55;
        } else {
          b.x -= ((b.x - b.baseX) / 11) * t;
          b.y -= ((b.y - b.baseY) / 11) * t;
        }
      }

      for (let i = 0; i < bodies.length; i += 1) {
        const a = bodies[i];
        if (a.kind === "dust") continue;
        let links = 0;
        for (let j = i + 1; j < bodies.length && links < 3; j += 1) {
          const b = bodies[j];
          if (b.kind === "dust") continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d >= LINK) continue;
          const alpha = 0.22 * (1 - d / LINK);
          ctx.strokeStyle = `rgba(${pal.aurora}, ${alpha})`;
          ctx.lineWidth = a.kind === "star" || b.kind === "star" ? 1.05 : 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          links += 1;
        }
      }

      for (const b of bodies) drawBody(ctx, b, pal);

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.life -= 0.018 * t;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const r = 10 + (1 - s.life) * 18;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        g.addColorStop(0, `rgba(${pal.aurora}, ${0.42 * s.life})`);
        g.addColorStop(0.45, `rgba(${pal.gold}, ${0.16 * s.life})`);
        g.addColorStop(1, `rgba(${pal.aurora}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = window.requestAnimationFrame(step);
    }

    function onVis() {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(frame);
        return;
      }
      if (reduce) return;
      running = true;
      last = performance.now();
      frame = window.requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);
    canvas.parentElement?.addEventListener("pointermove", onMove);
    canvas.parentElement?.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    const unsubscribeTheme = subscribeTheme(onTheme);

    if (reduce) {
      paintStatic();
    } else {
      frame = window.requestAnimationFrame(step);
    }

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      canvas.parentElement?.removeEventListener("pointermove", onMove);
      canvas.parentElement?.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      unsubscribeTheme();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-1" aria-hidden="true" />
  );
}

function drawBody(ctx: CanvasRenderingContext2D, b: Body, pal: Palette) {
  if (b.kind === "star") {
    ctx.fillStyle = `rgba(${pal.gold}, 0.92)`;
    northStar(ctx, b.x, b.y, b.size);
    return;
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
  if (b.kind === "node") {
    ctx.fillStyle = `rgba(${pal.aurora}, 0.72)`;
  } else {
    ctx.fillStyle = `rgba(${pal.star}, ${0.18 + b.size * 0.12})`;
  }
  ctx.fill();
}
