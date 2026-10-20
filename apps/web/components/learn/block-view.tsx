"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { blockMeta, embedSrc, hostOf, parseCode, videoSource, type BlockType } from "@/lib/blocks";
import { formatMinutes, type CourseBlock } from "@/lib/course-model";

import { CodeBlock } from "./code-block";
import { Flashcard } from "./flashcard";
import { LessonMarkdown } from "./lesson-markdown";
import { Quiz } from "./quiz";
import { parseFlashcard, parseQuiz } from "./recall-data";

function Frame({ src, title, ratio = "16/9" }: { src: string; title: string; ratio?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-night-800 bg-black" style={{ aspectRatio: ratio }}>
      <iframe
        src={src}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function Missing({ type }: { type: BlockType }) {
  return (
    <p className="rounded-xl border border-dashed border-night-800 px-4 py-6 text-sm text-star-400">
      This {blockMeta(type).label.toLowerCase()} has no source yet.
    </p>
  );
}

function Notes({ body }: { body: string | null }) {
  if (!body?.trim()) return null;
  return (
    <div className="mt-4">
      <LessonMarkdown markdown={body} />
    </div>
  );
}

function LinkCard({ block }: { block: CourseBlock }) {
  const host = hostOf(block.url);
  const Icon = blockMeta(block.type).icon;
  if (!block.url) return <Missing type={block.type} />;
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-4 rounded-2xl border border-night-800 bg-night-900/70 p-5 transition-colors hover:border-aurora-400/50"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-night-800 text-aurora-400">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-star-100">
          {block.title || block.sourceName || host}
        </span>
        {block.body ? (
          <span className="mt-1 line-clamp-3 block text-sm leading-relaxed text-star-400">{block.body}</span>
        ) : null}
        <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-star-400 uppercase group-hover:text-aurora-400">
          {host} <ExternalLink className="size-3" />
        </span>
      </span>
    </a>
  );
}

function BlockBody({ block, lessonTitle }: { block: CourseBlock; lessonTitle: string }) {
  switch (block.type) {
    case "ai_text":
      return block.body ? <LessonMarkdown markdown={block.body} title={lessonTitle} /> : <Missing type="ai_text" />;
    case "youtube":
    case "video": {
      const source = videoSource(block.url);
      if (!source) return <Missing type={block.type} />;
      return (
        <>
          {source.kind === "iframe" ? (
            <Frame src={source.src} title={block.title ?? "Video"} />
          ) : (
            <video controls preload="metadata" className="w-full rounded-2xl border border-night-800 bg-black">
              <source src={source.src} />
            </video>
          )}
          <Notes body={block.body} />
        </>
      );
    }
    case "audio":
      if (!block.url) return <Missing type="audio" />;
      return (
        <div className="rounded-2xl border border-night-800 bg-night-900/70 p-5">
          <audio controls preload="metadata" className="w-full">
            <source src={block.url} />
          </audio>
          <Notes body={block.body} />
        </div>
      );
    case "image":
      if (!block.url) return <Missing type="image" />;
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- creator-supplied remote images */}
          <img
            src={block.url}
            alt={block.title ?? block.body ?? "Lesson image"}
            className="w-full rounded-2xl border border-night-800 bg-night-900 object-contain"
            loading="lazy"
          />
          {block.body ? (
            <figcaption className="mt-3 text-sm leading-relaxed text-star-400">{block.body}</figcaption>
          ) : null}
        </figure>
      );
    case "pdf_extract":
      return (
        <div className="space-y-4">
          {block.url && /\.pdf($|\?)/i.test(block.url) ? (
            <Frame src={block.url} title={block.title ?? "Document"} ratio="4/5" />
          ) : null}
          {block.body ? <LessonMarkdown markdown={block.body} /> : null}
          {block.url ? <LinkCard block={block} /> : null}
          {!block.url && !block.body ? <Missing type="pdf_extract" /> : null}
        </div>
      );
    case "blog":
    case "resource":
      return <LinkCard block={block} />;
    case "embed": {
      const src = embedSrc(block.url);
      if (!src) return <Missing type="embed" />;
      return (
        <>
          <Frame src={src} title={block.title ?? "Interactive"} ratio="4/3" />
          <Notes body={block.body} />
        </>
      );
    }
    case "code": {
      const data = parseCode(block.body);
      return data ? <CodeBlock language={data.language} code={data.code} title={block.title} /> : <Missing type="code" />;
    }
    case "quiz": {
      const data = parseQuiz(block.body);
      return data ? <Quiz data={data} /> : <Missing type="quiz" />;
    }
    case "flashcard": {
      const data = parseFlashcard(block.body);
      return data ? <Flashcard data={data} /> : <Missing type="flashcard" />;
    }
    default: {
      const _exhaustive: never = block.type;
      return _exhaustive;
    }
  }
}

function showsOwnTitle(type: BlockType): boolean {
  return type === "blog" || type === "resource" || type === "code";
}

/** One piece of lesson content, rendered for its type. */
export function BlockView({
  block,
  index,
  lessonTitle,
}: {
  block: CourseBlock;
  index: number;
  lessonTitle: string;
}) {
  const meta = blockMeta(block.type);
  const Icon = meta.icon;
  const heading = block.type === "ai_text" ? null : block.title;

  return (
    <section id={`block-${block.id}`} className="scroll-mt-24" aria-label={block.title ?? meta.label}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="aurora" className="gap-1.5">
          <Icon className="size-3" />
          {meta.verb}
        </Badge>
        <span className="font-mono text-[11px] tracking-[0.12em] text-star-400 uppercase">
          Part {index + 1}
          {block.durationSeconds ? ` · ${formatMinutes(Math.ceil(block.durationSeconds / 60))}` : ""}
        </span>
        {block.optional ? <Badge className="gap-1.5">Optional deep dive</Badge> : null}
        {block.provenanceModel ? (
          <span className="font-mono text-[11px] tracking-[0.12em] text-star-400/70 uppercase">
            · agent-written
          </span>
        ) : null}
      </div>
      {heading && !showsOwnTitle(block.type) ? (
        <h3 className="mb-4 text-xl font-semibold tracking-tight text-star-100">{heading}</h3>
      ) : null}
      <BlockBody block={block} lessonTitle={lessonTitle} />
      {block.sourceName && block.sourceUrl && !showsOwnTitle(block.type) && block.type !== "ai_text" ? (
        <p className="mt-3 text-xs text-star-400">
          Source:{" "}
          <a href={block.sourceUrl} target="_blank" rel="noreferrer" className="text-aurora-400 hover:underline">
            {block.sourceName}
          </a>
        </p>
      ) : null}
    </section>
  );
}
