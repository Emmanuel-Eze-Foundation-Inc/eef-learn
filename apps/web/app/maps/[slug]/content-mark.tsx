import { blockKindLabel } from "./content-media";

export type ContentKind =
  | "youtube"
  | "blog"
  | "ai_text"
  | "pdf_extract"
  | "flashcard"
  | "quiz"
  | "lesson";

export function contentKind(type: string | null | undefined): ContentKind {
  switch (type) {
    case "youtube":
    case "blog":
    case "ai_text":
    case "pdf_extract":
    case "flashcard":
    case "quiz":
      return type;
    default:
      return "lesson";
  }
}

/** Glyph for a beat. Gold only when earned. */
export function ContentMark({
  kind,
  mastered = false,
  current = false,
  ignite = false,
  size = 28,
}: {
  kind: ContentKind;
  mastered?: boolean;
  current?: boolean;
  ignite?: boolean;
  size?: number;
}) {
  const stroke = mastered ? "var(--gold-400)" : current ? "var(--aurora-400)" : "var(--star-400)";
  const fill = mastered ? "var(--gold-400)" : current ? "var(--aurora-400)" : "transparent";
  const glow = mastered
    ? "drop-shadow-[0_0_10px_rgba(242,193,78,0.55)]"
    : current
      ? "drop-shadow-[0_0_10px_rgba(52,217,140,0.55)]"
      : "";

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={`${glow} ${
        ignite
          ? "origin-center motion-safe:animate-[mark-earn_620ms_var(--ease-out)_both]"
          : ""
      }`}
      aria-hidden="true"
    >
      <MarkShape kind={kind} stroke={stroke} fill={fill} />
    </svg>
  );
}

function MarkShape({
  kind,
  stroke,
  fill,
}: {
  kind: ContentKind;
  stroke: string;
  fill: string;
}) {
  switch (kind) {
    case "youtube":
      return (
        <>
          <rect x="4" y="8" width="24" height="16" rx="3" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M13 12.5 L13 19.5 L21 16 Z" fill={fill === "transparent" ? stroke : fill} />
        </>
      );
    case "blog":
      return (
        <>
          <path
            d="M8 5 h12 l6 6 v16 h-18 z"
            fill="none"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M20 5 v6 h6" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M11 16 h10 M11 20 h8 M11 24 h6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "ai_text":
      return (
        <>
          <circle cx="16" cy="16" r="6" fill={fill === "transparent" ? "none" : fill} stroke={stroke} strokeWidth="1.6" />
          <circle cx="16" cy="16" r="2" fill={stroke} />
          <path
            d="M16 4 v4 M16 24 v4 M4 16 h4 M24 16 h4"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );
    case "pdf_extract":
      return (
        <>
          <rect x="7" y="5" width="18" height="22" rx="1.5" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M11 12 h10 M11 16 h10 M11 20 h6" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "flashcard":
      return (
        <>
          <rect
            x="6"
            y="8"
            width="16"
            height="14"
            rx="2"
            fill="none"
            stroke={stroke}
            strokeWidth="1.4"
            transform="rotate(-8 14 15)"
          />
          <rect
            x="10"
            y="10"
            width="16"
            height="14"
            rx="2"
            fill={fill === "transparent" ? "var(--night-950)" : fill}
            stroke={stroke}
            strokeWidth="1.6"
          />
        </>
      );
    case "quiz":
      return (
        <>
          <circle cx="16" cy="16" r="10" fill="none" stroke={stroke} strokeWidth="1.6" />
          <circle cx="16" cy="11.5" r="1.6" fill={stroke} />
          <circle cx="11.5" cy="19" r="1.6" fill="none" stroke={stroke} strokeWidth="1.3" />
          <circle cx="20.5" cy="19" r="1.6" fill="none" stroke={stroke} strokeWidth="1.3" />
        </>
      );
    case "lesson":
      return (
        <>
          <circle cx="16" cy="16" r="7" fill="none" stroke={stroke} strokeWidth="1.6" />
          <circle cx="16" cy="16" r="2.2" fill={stroke} />
        </>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function kindCaption(kind: ContentKind): string {
  return blockKindLabel(kind);
}
