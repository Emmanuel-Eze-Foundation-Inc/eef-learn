import type { BlockType } from "../lib/blocks";

export type SourceSpec = {
  type: "youtube" | "blog" | "video" | "audio" | "image" | "resource" | "embed" | "pdf";
  name: string;
  url: string;
};

export type BlockSpec = {
  type: BlockType;
  title: string;
  body?: string;
  url?: string;
  /** A deep dive the lesson doesn't depend on; its time is shown apart from the lesson's. */
  optional?: boolean;
  /** Credit for someone else's work; blocks without one are written by the course author. */
  source?: SourceSpec;
};

export type LessonSpec = {
  slug: string;
  title: string;
  blocks: BlockSpec[];
  lessons?: LessonSpec[];
};

export type CourseSpec = {
  title: string;
  topic: string;
  brief: { audience?: string; startingPoint?: string; depth?: string; notes?: string };
  /** Who wrote the unattributed blocks (stored as provenance). */
  author: string;
  modules: LessonSpec[];
  /** [from, to]: `to` unlocks after `from` is mastered. */
  prerequisites: [string, string][];
};

export const quiz = (prompt: string, options: string[], correct: number[]) =>
  JSON.stringify({
    prompt,
    mode: correct.length > 1 ? "multi" : "radio",
    options: options.map((label, i) => ({ id: String.fromCharCode(97 + i), label })),
    correct: correct.map((i) => String.fromCharCode(97 + i)),
  });

/** A hands-on YouTube walkthrough, labelled so learners can tell it from talks and explainers. */
export const tutorial = (
  videoId: string,
  title: string,
  channel: string,
  body: string,
  { optional = false }: { optional?: boolean } = {},
): BlockSpec => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  return {
    type: "youtube",
    title: `Tutorial: ${title}`,
    url,
    body,
    optional,
    source: { type: "youtube", name: channel, url },
  };
};

export const card = (front: string, back: string) => JSON.stringify({ front, back });

export const code = (language: string, source: string) => JSON.stringify({ language, code: source.trim() });
