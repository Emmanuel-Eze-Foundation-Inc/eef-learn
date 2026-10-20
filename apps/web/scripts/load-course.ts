/**
 * Load a hand-authored course into a creator's account.
 *
 *   set -a && . ./.env.local && set +a
 *   pnpm course:load ai-engineering you@eeflearn.local
 *
 * Re-running replaces the creator's previous copy (same title, same URL) and
 * clears learner progress on it. Every block is
 * checked with the app's own rules before anything is written.
 */
import { flattenTree, layoutTree, slugifyTopic, titleFromTopic, validateSkeleton } from "@eef/core";
import { prisma } from "@eef/db";
import { createId } from "@paralleldrive/cuid2";

import { blockProblem } from "../lib/blocks";
import { mediaDurationSeconds } from "../lib/media-duration";
import type { CourseSpec, LessonSpec } from "./course-spec";
import { aiEngineering } from "./courses/ai-engineering";

const COURSES: Record<string, CourseSpec> = { "ai-engineering": aiEngineering };

type FlatLesson = LessonSpec & { id: string; parentSlug: string | null; order: number };

function flatten(lessons: LessonSpec[], parentSlug: string | null = null): FlatLesson[] {
  return lessons.flatMap((lesson, order) => [
    { ...lesson, id: `node_${createId()}`, parentSlug, order },
    ...flatten(lesson.lessons ?? [], lesson.slug),
  ]);
}

function check(course: CourseSpec, lessons: FlatLesson[]): string[] {
  const problems = validateSkeleton({
    nodes: lessons.map((l) => ({ slug: l.slug, title: l.title, order: l.order, parent: l.parentSlug })),
    edges: course.prerequisites.map(([from, to]) => ({ from, to, kind: "prerequisite" })),
  });
  const travel = new Map(flattenTree(lessons.map((l) => ({ ...l, id: l.slug, parentId: l.parentSlug }))).map((l, i) => [l.slug, i]));
  for (const [from, to] of course.prerequisites) {
    if ((travel.get(from) ?? -1) >= (travel.get(to) ?? -1)) problems.push(`prerequisite ${from} → ${to} runs against travel order`);
  }
  for (const lesson of lessons) {
    if (!lesson.blocks.length) problems.push(`${lesson.slug}: no blocks`);
    lesson.blocks.forEach((b, i) => {
      const problem = blockProblem(b.type, { body: b.body ?? null, url: b.url ?? null });
      if (problem) problems.push(`${lesson.slug} #${i + 1} ${b.type}: ${problem}`);
      if (b.url && !b.source) problems.push(`${lesson.slug} #${i + 1} ${b.type}: linked work needs a source credit`);
    });
  }
  return problems;
}

async function main() {
  const [key, email] = process.argv.slice(2);
  const course = key ? COURSES[key] : undefined;
  if (!course || !email) throw new Error(`usage: load-course <${Object.keys(COURSES).join("|")}> <creator email>`);

  const creator = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!creator) throw new Error(`no user ${email}`);

  const lessons = flatten(course.modules);
  const problems = check(course, lessons);
  if (problems.length) throw new Error(`course has problems:\n- ${problems.join("\n- ")}`);

  const media = lessons.flatMap((l) => l.blocks).filter((b) => b.url);
  const durations = new Map(await Promise.all(media.map(async (b) => [b, await mediaDurationSeconds(b.type, b.url!)] as const)));
  const missing = media.filter((b) => (b.type === "youtube" || b.type === "video") && !durations.get(b));
  if (missing.length) console.warn(`No length found for: ${missing.map((b) => b.url).join(", ")}`);

  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  const positions = layoutTree(
    lessons.map((l) => ({ id: l.id, parentId: l.parentSlug ? bySlug.get(l.parentSlug)!.id : null, order: l.order })),
  );

  const map = await prisma.$transaction(
    async (tx) => {
      const previous = await tx.map.findFirst({
        where: { creatorId: creator.id, title: course.title },
        select: { slug: true },
      });
      await tx.map.deleteMany({ where: { creatorId: creator.id, title: course.title } });
      const created = await tx.map.create({
        data: {
          slug: previous?.slug ?? slugifyTopic(course.title.split(":")[0]),
          title: titleFromTopic(course.title),
          topic: course.topic,
          brief: course.brief,
          creatorId: creator.id,
        },
      });
      for (const l of lessons) {
        const pos = positions.get(l.id)!;
        await tx.node.create({
          data: {
            id: l.id,
            mapId: created.id,
            slug: l.slug,
            title: l.title,
            order: l.order,
            parentId: l.parentSlug ? bySlug.get(l.parentSlug)!.id : null,
            positionX: pos.x,
            positionY: pos.y,
          },
        });
        for (const [blockIndex, b] of l.blocks.entries()) {
          await tx.contentBlock.create({
            data: {
              id: `blk_${createId()}`,
              nodeId: l.id,
              blockIndex,
              type: b.type,
              title: b.title,
              body: b.body ?? null,
              url: b.url ?? null,
              durationSeconds: durations.get(b) ?? null,
              optional: b.optional ?? false,
              mapVersion: created.version,
              provenanceModel: b.source ? null : course.author,
              attributions: b.source
                ? { create: { sourceType: b.source.type, sourceName: b.source.name, sourceUrl: b.source.url } }
                : undefined,
            },
          });
        }
      }
      for (const [from, to] of course.prerequisites) {
        await tx.edge.create({
          data: { mapId: created.id, fromId: bySlug.get(from)!.id, toId: bySlug.get(to)!.id, kind: "prerequisite" },
        });
      }
      return created;
    },
    { timeout: 60_000 },
  );

  const blocks = lessons.reduce((n, l) => n + l.blocks.length, 0);
  console.log(`Loaded "${map.title}" → /maps/${map.slug} (${lessons.length} lessons, ${blocks} blocks, private)`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
