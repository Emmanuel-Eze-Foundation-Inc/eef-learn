const WATCH = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(WATCH);
  return match?.[1] ?? null;
}

export function blockKindLabel(type: string): string {
  switch (type) {
    case "youtube":
      return "Watch";
    case "blog":
      return "Read";
    case "pdf_extract":
      return "From the paper";
    case "ai_text":
      return "The idea";
    case "flashcard":
      return "Recall";
    case "quiz":
      return "Check";
    default:
      return "Lesson";
  }
}
