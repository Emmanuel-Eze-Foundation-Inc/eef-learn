import {
  AppWindow,
  BookOpen,
  CirclePlay,
  Code,
  FileText,
  Headphones,
  Image,
  Layers,
  Link2,
  ListChecks,
  Newspaper,
  Video,
  type LucideIcon,
} from "lucide-react";

/** Every content type a lesson can hold, in the order the add-menu shows them. */
export const BLOCK_TYPES = [
  "ai_text",
  "youtube",
  "video",
  "audio",
  "image",
  "pdf_extract",
  "blog",
  "resource",
  "embed",
  "code",
  "quiz",
  "flashcard",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockMeta = {
  label: string;
  verb: string;
  icon: LucideIcon;
  /** url is required for the block to render */
  needsUrl: boolean;
  urlHint?: string;
  bodyHint?: string;
  /** rough minutes for the time estimate */
  minutes: number;
};

export function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}

export function blockMeta(type: BlockType): BlockMeta {
  switch (type) {
    case "ai_text":
      return {
        label: "Reading",
        verb: "Read",
        icon: BookOpen,
        needsUrl: false,
        bodyHint: "Markdown lesson text — headings, lists, tables, links.",
        minutes: 5,
      };
    case "youtube":
      return {
        label: "YouTube",
        verb: "Watch",
        icon: CirclePlay,
        needsUrl: true,
        urlHint: "https://www.youtube.com/watch?v=…",
        bodyHint: "What to watch for (optional).",
        minutes: 8,
      };
    case "video":
      return {
        label: "Video",
        verb: "Watch",
        icon: Video,
        needsUrl: true,
        urlHint: "Vimeo, Loom, or a direct .mp4 link",
        bodyHint: "What to watch for (optional).",
        minutes: 8,
      };
    case "audio":
      return {
        label: "Audio",
        verb: "Listen",
        icon: Headphones,
        needsUrl: true,
        urlHint: "Direct .mp3 / .m4a link",
        bodyHint: "Show notes (optional).",
        minutes: 10,
      };
    case "image":
      return {
        label: "Image",
        verb: "Look",
        icon: Image,
        needsUrl: true,
        urlHint: "https://…/diagram.png",
        bodyHint: "Caption or what to notice.",
        minutes: 1,
      };
    case "pdf_extract":
      return {
        label: "Document",
        verb: "Read",
        icon: FileText,
        needsUrl: false,
        urlHint: "Link to the PDF (optional)",
        bodyHint: "Key passage or summary from the document.",
        minutes: 6,
      };
    case "blog":
      return {
        label: "Article",
        verb: "Read",
        icon: Newspaper,
        needsUrl: true,
        urlHint: "https://…",
        bodyHint: "Why this article matters.",
        minutes: 7,
      };
    case "resource":
      return {
        label: "Resource",
        verb: "Open",
        icon: Link2,
        needsUrl: true,
        urlHint: "Docs, a dataset, a repo, a download",
        bodyHint: "What it is and when to use it.",
        minutes: 2,
      };
    case "embed":
      return {
        label: "Interactive",
        verb: "Try",
        icon: AppWindow,
        needsUrl: true,
        urlHint: "CodePen, CodeSandbox, Figma, Google Slides embed URL",
        bodyHint: "What to try in it.",
        minutes: 6,
      };
    case "code":
      return {
        label: "Code",
        verb: "Study",
        icon: Code,
        needsUrl: false,
        bodyHint: '{"language":"python","code":"print(\\"hi\\")"}',
        minutes: 4,
      };
    case "quiz":
      return {
        label: "Quiz",
        verb: "Check",
        icon: ListChecks,
        needsUrl: false,
        bodyHint: '{"prompt":"…","mode":"radio","options":[{"id":"a","label":"…"}],"correct":["a"]}',
        minutes: 2,
      };
    case "flashcard":
      return {
        label: "Flashcard",
        verb: "Recall",
        icon: Layers,
        needsUrl: false,
        bodyHint: '{"front":"…","back":"…"}',
        minutes: 1,
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export type CodeData = { language: string; code: string };

export function parseCode(body: string | null): CodeData | null {
  if (!body) return null;
  try {
    const raw = JSON.parse(body) as unknown;
    if (raw && typeof raw === "object" && typeof (raw as CodeData).code === "string") {
      const lang = (raw as CodeData).language;
      return { language: typeof lang === "string" ? lang : "", code: (raw as CodeData).code };
    }
  } catch {
    // plain code body
  }
  return { language: "", code: body };
}

/** Embeds must be https and never point back at this app. */
export function embedSrc(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;
const LOOM = /loom\.com\/(?:share|embed)\/([a-f0-9]+)/;

export type VideoSource = { kind: "iframe"; src: string } | { kind: "file"; src: string };

export function videoSource(url: string | null): VideoSource | null {
  if (!url) return null;
  const yt = youtubeId(url);
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0` };
  const vimeo = url.match(VIMEO);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  const loom = url.match(LOOM);
  if (loom) return { kind: "iframe", src: `https://www.loom.com/embed/${loom[1]}` };
  return url.startsWith("https://") ? { kind: "file", src: url } : null;
}

const WATCH = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.match(WATCH)?.[1] ?? null;
}

/** Why this url can't back a block of this type, or null when it can. */
export function blockUrlProblem(type: BlockType, url: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return "Links start with https://";
  switch (type) {
    case "youtube":
      return youtubeId(url) ? null : "That isn't a YouTube video link.";
    case "video":
      return videoSource(url) ? null : "Use a YouTube, Vimeo, or Loom link, or an https video file.";
    case "audio":
    case "image":
    case "embed":
      return url.startsWith("https://") ? null : "This type needs an https:// link.";
    case "ai_text":
    case "pdf_extract":
    case "blog":
    case "resource":
    case "code":
    case "quiz":
    case "flashcard":
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** What a block still needs before a learner can use it, or null when it's ready. */
export function blockProblem(type: BlockType, fields: { body: string | null; url: string | null }): string | null {
  const urlProblem = blockUrlProblem(type, fields.url);
  if (urlProblem) return urlProblem;
  const meta = blockMeta(type);
  if (meta.needsUrl && !fields.url) return "Add a link.";
  switch (type) {
    case "ai_text":
      return fields.body?.trim() ? null : "Write the lesson text.";
    case "pdf_extract":
      return fields.body?.trim() || fields.url ? null : "Add a passage or a link to the document.";
    case "code":
      return parseCode(fields.body)?.code.trim() ? null : "Add the code.";
    case "quiz": {
      try {
        const quiz = JSON.parse(fields.body ?? "") as { prompt?: string; options?: { id: string }[]; correct?: string[] };
        if (!quiz.prompt?.trim()) return "Write the question.";
        const ids = new Set((quiz.options ?? []).map((o) => o.id));
        if (ids.size < 2) return "Add at least two options.";
        if (!(quiz.correct ?? []).some((id) => ids.has(id))) return "Mark the right answer.";
        return null;
      } catch {
        return "Write the question.";
      }
    }
    case "flashcard": {
      try {
        const card = JSON.parse(fields.body ?? "") as { front?: string; back?: string };
        return card.front?.trim() && card.back?.trim() ? null : "Fill in both sides of the card.";
      } catch {
        return "Fill in both sides of the card.";
      }
    }
    case "youtube":
    case "video":
    case "audio":
    case "image":
    case "blog":
    case "resource":
    case "embed":
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
