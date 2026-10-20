import { Flag } from "lucide-react";

import { blockMeta } from "@/lib/blocks";
import type { CourseCard, CourseSummary } from "@/lib/public-maps";
import { cn } from "@/lib/utils";

const W = 240;
const H = 64;
const PAD = 56;
const R = 12;

/** Elbow from a parent card's left spine down and into the child's left edge. */
function spinePath(parent: CourseCard, child: CourseCard) {
  const spine = Math.min(parent.x, child.x) - 18;
  const y0 = parent.y + H / 2;
  const y1 = child.y + H / 2;
  if (Math.abs(y1 - y0) < 2 * R) return `M ${parent.x} ${y0} H ${spine} V ${y1} H ${child.x}`;
  const dir = y1 > y0 ? 1 : -1;
  return [
    `M ${parent.x} ${y0}`,
    `H ${spine + R}`,
    `Q ${spine} ${y0} ${spine} ${y0 + R * dir}`,
    `V ${y1 - R * dir}`,
    `Q ${spine} ${y1} ${spine + R} ${y1}`,
    `H ${child.x}`,
  ].join(" ");
}

/** Intro fans out to module heads from its bottom edge. */
function fanPath(parent: CourseCard, child: CourseCard) {
  const x0 = parent.x + W / 2;
  const x1 = child.x + W / 2;
  const mid = (parent.y + H + child.y) / 2;
  return `M ${x0} ${parent.y + H} V ${mid} H ${x1} V ${child.y}`;
}

function prereqPath(from: CourseCard, to: CourseCard) {
  const x0 = from.x + W;
  const y0 = from.y + H / 2;
  const x1 = to.x;
  const y1 = to.y + H / 2;
  const bend = Math.max(48, Math.abs(x1 - x0) / 2);
  return `M ${x0} ${y0} C ${x0 + bend} ${y0} ${x1 - bend} ${y1} ${x1} ${y1}`;
}

/** Small courses would otherwise zoom to giant cards in a large preview. */
const MIN_VIEW = { w: 1320, h: 760 };

function frame(cards: CourseCard[], min: { w: number; h: number }) {
  const minX = Math.min(...cards.map((c) => c.x)) - PAD;
  const minY = Math.min(...cards.map((c) => c.y)) - PAD;
  const w = Math.max(...cards.map((c) => c.x + W)) + PAD - minX;
  const h = Math.max(...cards.map((c) => c.y + H)) + PAD - minY;
  const fw = Math.max(w, min.w);
  const fh = Math.max(h, min.h);
  return { x: minX - (fw - w) / 2, y: minY - (fh - h) / 2, w: fw, h: fh };
}

const COL = 300;
const GAP = 72;
const TARGET_ASPECT = 1.6;
const COURSE_INTRO_GAP = 156;

/**
 * Courses laid out as one long row of modules shrink to a sliver in a preview,
 * so very wide maps wrap their module columns into rows. Each module keeps its
 * own internal layout; only whole columns move.
 */
function fitCards(cards: CourseCard[]): CourseCard[] {
  const heads = cards.filter((c) => c.role === "module");
  if (heads.length < 4) return cards;
  const width = Math.max(...cards.map((c) => c.x)) - Math.min(...cards.map((c) => c.x)) + W;
  const height = Math.max(...cards.map((c) => c.y)) - Math.min(...cards.map((c) => c.y)) + H;
  if (width / height < 2.6) return cards;

  const byParent = new Map<string, CourseCard[]>();
  for (const c of cards) if (c.parentId) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  const subtree = (id: string): CourseCard[] => (byParent.get(id) ?? []).flatMap((c) => [c, ...subtree(c.id)]);
  const blocks = heads.map((head) => {
    const members = [head, ...subtree(head.id)];
    return { head, members, height: Math.max(...members.map((m) => m.y - head.y)) + H };
  });

  const rowsFor = (cols: number) => {
    const rows: (typeof blocks)[] = [];
    for (let i = 0; i < blocks.length; i += cols) rows.push(blocks.slice(i, i + cols));
    return rows;
  };
  const totalHeight = (rows: (typeof blocks)[]) =>
    rows.reduce((sum, row) => sum + Math.max(...row.map((b) => b.height)), 0) + GAP * (rows.length - 1);
  let best = blocks.length;
  let bestScore = Infinity;
  for (let cols = 1; cols <= blocks.length; cols += 1) {
    const score = Math.abs(Math.log((cols * COL) / totalHeight(rowsFor(cols)) / TARGET_ASPECT));
    if (score < bestScore) {
      best = cols;
      bestScore = score;
    }
  }

  const moved = new Map<string, { x: number; y: number }>();
  let top = 0;
  for (const row of rowsFor(best)) {
    row.forEach((block, i) => {
      for (const m of block.members) {
        moved.set(m.id, { x: i * COL + (m.x - block.head.x), y: top + (m.y - block.head.y) });
      }
    });
    top += Math.max(...row.map((b) => b.height)) + GAP;
  }
  const intro = cards.find((c) => c.role === "intro");
  if (intro) moved.set(intro.id, { x: ((Math.min(best, blocks.length) - 1) * COL) / 2, y: -COURSE_INTRO_GAP });
  return cards.map((c) => ({ ...c, ...(moved.get(c.id) ?? {}) }));
}

/** Width over height of the drawn map, before any minimum frame is applied. */
export function courseAspect(course: CourseSummary): number {
  if (!course.cards.length) return 1;
  const box = frame(fitCards(course.cards), { w: 0, h: 0 });
  return box.w / box.h;
}

/** The maps whose drawn shape best fills a frame of the given aspect. */
export function mapsThatFit<T extends { course: CourseSummary }>(maps: T[], aspect: number, take: number): T[] {
  const fit = (m: T) => Math.abs(Math.log(courseAspect(m.course) / aspect));
  return [...maps].sort((a, b) => fit(a) - fit(b)).slice(0, take);
}

/**
 * A published course drawn as its real map. `detail` labels every card and
 * marks start and finish; `glyph` is the small list thumbnail. "Builds on"
 * links that just follow travel order, run down one column, or point back
 * left are left out: the layout already shows that sequence.
 */
export function CourseThumb({
  course,
  variant = "detail",
  animate = false,
  minFrame = MIN_VIEW,
  className,
}: {
  course: CourseSummary;
  variant?: "detail" | "glyph";
  /** cards arrive one by one in travel order */
  animate?: boolean;
  /** smallest viewBox in detail mode; smaller zooms small courses in further */
  minFrame?: { w: number; h: number };
  className?: string;
}) {
  const { prerequisites } = course;
  if (!course.cards.length) return <div className={className} />;
  const cards = fitCards(course.cards);

  const byId = new Map(cards.map((c) => [c.id, c]));
  const travel = new Map(cards.map((c, i) => [c.id, i]));
  const detail = variant === "detail";
  const box = frame(cards, detail ? minFrame : { w: 0, h: 0 });
  const start = cards[0];
  const finish = cards.length > 1 ? cards[cards.length - 1] : null;
  const step = Math.min(90, 1400 / cards.length);
  const arrive = (index: number): React.CSSProperties | undefined =>
    animate ? { animation: "arrive 420ms var(--ease-out) both", animationDelay: `${Math.round(index * step)}ms` } : undefined;

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block", className)}
      role={detail ? "img" : undefined}
      aria-label={detail ? `Course map: ${course.modules.length} modules, ${course.lessons} lessons` : undefined}
      aria-hidden={detail ? undefined : true}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {cards.map((card) => {
          const parent = card.parentId ? byId.get(card.parentId) : null;
          if (!parent) return null;
          return (
            <path
              key={`c-${card.id}`}
              d={parent.role === "intro" ? fanPath(parent, card) : spinePath(parent, card)}
              className="stroke-edge"
              strokeWidth={detail ? 2.5 : 4}
              style={arrive(travel.get(card.id) ?? 0)}
            />
          );
        })}
        {prerequisites.map((edge) => {
          const from = byId.get(edge.fromId);
          const to = byId.get(edge.toId);
          if (!from || !to || to.x < from.x + W) return null;
          if (travel.get(to.id) === (travel.get(from.id) ?? -2) + 1) return null;
          return (
            <path
              key={`p-${edge.fromId}-${edge.toId}`}
              d={prereqPath(from, to)}
              className="stroke-aurora-400"
              strokeWidth={detail ? 2 : 4}
              strokeDasharray="10 9"
              opacity={0.65}
              style={arrive(travel.get(to.id) ?? 0)}
            />
          );
        })}
      </g>

      {cards.map((card, i) => {
        const Icon = card.lead ? blockMeta(card.lead).icon : null;
        const head = card.role !== "lesson";
        return (
          <g key={card.id} style={arrive(i)}>
            {detail ? <title>{card.title}</title> : null}
            <rect
              x={card.x}
              y={card.y}
              width={W}
              height={H}
              rx={16}
              className={cn(
                head ? "fill-night-850 stroke-aurora-400/45" : "fill-night-900 stroke-night-800",
              )}
              strokeWidth={detail ? 2 : 3}
            />
            {detail ? (
              <>
                {Icon ? (
                  <Icon
                    x={card.x + 16}
                    y={card.y + H / 2 - 11}
                    width={22}
                    height={22}
                    strokeWidth={2}
                    className={head ? "text-aurora-400" : "text-star-400"}
                  />
                ) : (
                  <circle
                    cx={card.x + 27}
                    cy={card.y + H / 2}
                    r={6}
                    className="fill-none stroke-star-400/60"
                    strokeWidth={2}
                  />
                )}
                <foreignObject x={card.x + 48} y={card.y} width={W - 48 - 16} height={H}>
                  <p
                    className={cn(
                      "flex h-full items-center",
                      head ? "font-semibold text-star-100" : "font-medium text-star-100/85",
                    )}
                    style={{ fontSize: 19, lineHeight: 1.2 }}
                  >
                    <span className="truncate">{card.title}</span>
                  </p>
                </foreignObject>
              </>
            ) : (
              <rect
                x={card.x + 20}
                y={card.y + H / 2 - 5}
                width={head ? 150 : 110}
                height={10}
                rx={5}
                className={head ? "fill-aurora-400/55" : "fill-star-400/30"}
              />
            )}
          </g>
        );
      })}

      {detail && start ? (
        <g style={arrive(0)}>
          <Marker card={start} label="Start" />
        </g>
      ) : null}
      {detail && finish ? (
        <g style={arrive(cards.length)}>
          <Marker card={finish} label="Finish" flag />
        </g>
      ) : null}
    </svg>
  );
}

function Marker({ card, label, flag = false }: { card: CourseCard; label: string; flag?: boolean }) {
  const width = flag ? 96 : 76;
  return (
    <g>
      <rect x={card.x} y={card.y - 34} width={width} height={26} rx={13} className="fill-gold-400/15 stroke-gold-400/60" strokeWidth={1.5} />
      {flag ? <Flag x={card.x + 10} y={card.y - 28} width={14} height={14} strokeWidth={2.25} className="text-gold-400" /> : null}
      <text x={card.x + (flag ? 30 : 14)} y={card.y - 16} fontSize={14} fontWeight={600} letterSpacing={1.2} className="fill-gold-400">
        {label.toUpperCase()}
      </text>
    </g>
  );
}
