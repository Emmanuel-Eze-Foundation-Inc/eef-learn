"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type OwlbertMood = "idle" | "thinking" | "asleep";

/*
 * Owlbert Einstar: an ancient intergalactic owl wearing a planetary ring and a monocle.
 * The palette is fixed (an illustration, not chrome) so he reads the same on light and dark.
 */
const INK = "#07120d";
const PLUME_TOP = "#1f3d2f";
const PLUME_BOTTOM = "#0d1c15";
const AURORA = "#34d98c";
const AURORA_DEEP = "#0e7a55";
const GOLD = "#f2c14e";
const STAR = "#eef5ef";

// Motion resolves SVG transform origins against each element's own box (0..1), not the viewBox.
const EASE = [0.45, 0, 0.55, 1] as const;

const ORBIT = { cy: 13, rx: 40, ry: 7 };
const MOON_PATH = (() => {
  const steps = Array.from({ length: 25 }, (_, i) => (i / 24) * Math.PI * 2);
  return {
    cx: steps.map((t) => 60 + ORBIT.rx * Math.cos(t)),
    cy: steps.map((t) => ORBIT.cy + ORBIT.ry * Math.sin(t)),
    r: steps.map((t) => 3 + 1.1 * Math.sin(t)),
  };
})();

export function Owlbert({
  size = 72,
  mood = "idle",
  float = true,
  watch = true,
  className,
}: {
  size?: number;
  mood?: OwlbertMood;
  float?: boolean;
  watch?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!watch || reduce || mood !== "idle") return;
    let frame = 0;
    function onMove(e: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height * 0.42);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, dist / 240) * 2.6;
        setLook({ x: (dx / dist) * reach, y: (dy / dist) * reach });
      });
    }
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [watch, reduce, mood]);

  useEffect(() => {
    if (reduce || mood === "asleep") return;
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 140);
          schedule();
        },
        3200 + Math.random() * 3000,
      );
    }
    schedule();
    return () => clearTimeout(timer);
  }, [reduce, mood]);

  const pupil = mood === "thinking" ? { x: 1.8, y: -2.4 } : look;
  const moonSeconds = mood === "thinking" ? 2.4 : 9;
  const animate = !reduce;

  return (
    <motion.div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
      animate={animate && float ? { y: [0, -5, 0] } : undefined}
      transition={{ duration: 4.2, ease: EASE, repeat: Infinity }}
    >
      <svg ref={ref} viewBox="0 0 120 120" width={size} height={size} aria-hidden className="overflow-visible">
        <defs>
          <linearGradient id={`plume-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PLUME_TOP} />
            <stop offset="1" stopColor={PLUME_BOTTOM} />
          </linearGradient>
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={AURORA_DEEP} />
            <stop offset="0.5" stopColor={AURORA} />
            <stop offset="1" stopColor={GOLD} />
          </linearGradient>
          <radialGradient id={`glow-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AURORA} stopOpacity="0.55" />
            <stop offset="1" stopColor={AURORA} stopOpacity="0" />
          </radialGradient>
          <clipPath id={`back-${uid}`}>
            <rect x="0" y="0" width="120" height="77" />
          </clipPath>
          <clipPath id={`front-${uid}`}>
            <rect x="0" y="77" width="120" height="43" />
          </clipPath>
        </defs>

        {/* thruster glow he floats on */}
        <motion.ellipse
          cx="60"
          cy="112"
          rx="26"
          ry="6"
          fill={`url(#glow-${uid})`}
          animate={animate && float ? { opacity: [0.9, 0.45, 0.9], rx: [26, 20, 26] } : undefined}
          transition={{ duration: 4.2, ease: EASE, repeat: Infinity }}
        />

        {/* planetary ring, back half */}
        <g transform="rotate(-10 60 77)" clipPath={`url(#back-${uid})`} opacity={mood === "asleep" ? 0.45 : 1}>
          <ellipse cx="60" cy="77" rx="55" ry="12" fill="none" stroke={`url(#ring-${uid})`} strokeWidth="3.5" />
        </g>

        {/* wings */}
        <motion.path
          d="M31 60 C 18 64, 15 82, 23 96 C 27 92, 30 84, 31 74 C 32 68, 32 64, 31 60 Z"
          fill={PLUME_BOTTOM}
          stroke={AURORA_DEEP}
          strokeWidth="1"
          style={{ originX: 1, originY: 0 }}
          animate={animate && mood !== "asleep" ? { rotate: [0, -7, 0] } : undefined}
          transition={{ duration: 4.2, ease: EASE, repeat: Infinity }}
        />
        <motion.path
          d="M89 60 C 102 64, 105 82, 97 96 C 93 92, 90 84, 89 74 C 88 68, 88 64, 89 60 Z"
          fill={PLUME_BOTTOM}
          stroke={AURORA_DEEP}
          strokeWidth="1"
          style={{ originX: 0, originY: 0 }}
          animate={animate && mood !== "asleep" ? { rotate: [0, 7, 0] } : undefined}
          transition={{ duration: 4.2, ease: EASE, repeat: Infinity }}
        />

        {/* ear tufts with star tips */}
        <path d="M34 34 L 30 14 L 46 28 Z" fill={PLUME_TOP} />
        <path d="M86 34 L 90 14 L 74 28 Z" fill={PLUME_TOP} />
        <Twinkle cx={30} cy={14} r={2.6} color={GOLD} delay={0} animate={animate} />
        <Twinkle cx={90} cy={14} r={2.6} color={AURORA} delay={1.3} animate={animate} />

        {/* body */}
        <path
          d="M60 22 C 86 22, 94 44, 94 66 C 94 92, 80 106, 60 106 C 40 106, 26 92, 26 66 C 26 44, 34 22, 60 22 Z"
          fill={`url(#plume-${uid})`}
          stroke={AURORA_DEEP}
          strokeWidth="1.2"
        />
        {/* belly: a little nebula of plumage */}
        <path d="M60 64 C 74 64, 80 76, 80 86 C 80 98, 70 104, 60 104 C 50 104, 40 98, 40 86 C 40 76, 46 64, 60 64 Z" fill={INK} opacity="0.45" />
        {[
          [52, 80, 1.1],
          [66, 76, 0.8],
          [58, 92, 0.9],
          [70, 90, 1.2],
          [48, 94, 0.7],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? GOLD : STAR} opacity="0.75" />
        ))}

        {/* face disc */}
        <path d="M60 36 C 76 34, 86 42, 86 54 C 86 64, 76 68, 60 64 C 44 68, 34 64, 34 54 C 34 42, 44 34, 60 36 Z" fill={INK} opacity="0.55" />

        <Eye cx={47} cy={52} pupil={pupil} blink={blink} mood={mood} />
        <Eye cx={73} cy={52} pupil={pupil} blink={blink} mood={mood} />

        {/* monocle on the right eye, chain draping to the ring */}
        <circle cx="73" cy="52" r="11.5" fill="none" stroke={GOLD} strokeWidth="1.8" />
        <path d="M84 56 C 90 66, 88 74, 92 80" fill="none" stroke={GOLD} strokeWidth="0.9" strokeDasharray="1.6 1.6" />

        {/* beak */}
        <path d="M60 58 L 65 63 L 60 70 L 55 63 Z" fill={GOLD} />

        {/* planetary ring, front half */}
        <g transform="rotate(-10 60 77)" clipPath={`url(#front-${uid})`} opacity={mood === "asleep" ? 0.45 : 1}>
          <ellipse cx="60" cy="77" rx="55" ry="12" fill="none" stroke={`url(#ring-${uid})`} strokeWidth="3.5" />
        </g>

        {/* a small moon on a tilted orbit above his head, like a halo */}
        {mood !== "asleep" ? (
          <>
            <ellipse cx="60" cy={ORBIT.cy} rx={ORBIT.rx} ry={ORBIT.ry} fill="none" stroke={STAR} strokeOpacity="0.18" strokeWidth="0.8" strokeDasharray="1.5 2.5" />
            <motion.circle
              fill={STAR}
              initial={false}
              animate={animate ? { cx: MOON_PATH.cx, cy: MOON_PATH.cy, r: MOON_PATH.r } : { cx: 60, cy: ORBIT.cy + ORBIT.ry, r: 3.6 }}
              transition={{ duration: moonSeconds, ease: "linear", repeat: Infinity }}
            />
          </>
        ) : (
          <Snores animate={animate} />
        )}
      </svg>
    </motion.div>
  );
}

function Eye({
  cx,
  cy,
  pupil,
  blink,
  mood,
}: {
  cx: number;
  cy: number;
  pupil: { x: number; y: number };
  blink: boolean;
  mood: OwlbertMood;
}) {
  if (mood === "asleep") {
    return (
      <g>
        <circle cx={cx} cy={cy} r="9.5" fill={INK} />
        <path d={`M${cx - 6} ${cy} Q ${cx} ${cy + 5}, ${cx + 6} ${cy}`} fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r="9.5" fill={GOLD} />
      <g
        style={{
          transform: `translate(${pupil.x}px, ${pupil.y}px)`,
          transition: "transform 180ms cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        <circle cx={cx} cy={cy} r="5.2" fill={INK} />
        <circle cx={cx + 1.8} cy={cy - 2} r="1.6" fill={STAR} />
      </g>
      {/* eyelid */}
      <circle
        cx={cx}
        cy={cy}
        r="10"
        fill={PLUME_TOP}
        style={{
          transformOrigin: `${cx}px ${cy - 10}px`,
          transform: `scaleY(${blink ? 1 : 0})`,
          transition: "transform 70ms ease-out",
        }}
      />
    </g>
  );
}

function Twinkle({
  cx,
  cy,
  r,
  color,
  delay,
  animate,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  delay: number;
  animate: boolean;
}) {
  return (
    <motion.path
      d={`M${cx} ${cy - r * 1.8} L ${cx + r * 0.5} ${cy - r * 0.5} L ${cx + r * 1.8} ${cy} L ${cx + r * 0.5} ${cy + r * 0.5} L ${cx} ${cy + r * 1.8} L ${cx - r * 0.5} ${cy + r * 0.5} L ${cx - r * 1.8} ${cy} L ${cx - r * 0.5} ${cy - r * 0.5} Z`}
      fill={color}
      style={{ originX: 0.5, originY: 0.5 }}
      animate={animate ? { opacity: [1, 0.35, 1], scale: [1, 0.7, 1] } : undefined}
      transition={{ duration: 2.6, ease: EASE, repeat: Infinity, delay }}
    />
  );
}

function Snores({ animate }: { animate: boolean }) {
  return (
    <g fill={STAR} fontFamily="var(--font-geist-mono), monospace" fontWeight="700">
      {[
        { x: 92, y: 26, s: 9, d: 0 },
        { x: 101, y: 14, s: 12, d: 0.9 },
      ].map((z) => (
        <motion.text
          key={z.x}
          x={z.x}
          y={z.y}
          fontSize={z.s}
          animate={animate ? { opacity: [0, 1, 0], y: [z.y + 4, z.y - 4] } : { opacity: 0.8 }}
          transition={{ duration: 2.8, ease: EASE, repeat: Infinity, delay: z.d }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}
