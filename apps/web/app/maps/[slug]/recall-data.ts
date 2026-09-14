export type FlashcardData = {
  front: string;
  back: string;
};

export type QuizOption = { id: string; label: string };

export type QuizData = {
  prompt: string;
  mode: "radio" | "multi";
  options: QuizOption[];
  correct: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseFlashcard(body: string | null): FlashcardData | null {
  if (!body) return null;
  try {
    const raw = asRecord(JSON.parse(body));
    if (!raw || typeof raw.front !== "string" || typeof raw.back !== "string") return null;
    return { front: raw.front, back: raw.back };
  } catch {
    return null;
  }
}

export function parseQuiz(body: string | null): QuizData | null {
  if (!body) return null;
  try {
    const raw = asRecord(JSON.parse(body));
    if (!raw || typeof raw.prompt !== "string" || !Array.isArray(raw.options) || !Array.isArray(raw.correct)) {
      return null;
    }
    const mode = raw.mode === "multi" ? "multi" : "radio";
    const options = raw.options.flatMap((item) => {
      const row = asRecord(item);
      if (!row || typeof row.id !== "string" || typeof row.label !== "string") return [];
      return [{ id: row.id, label: row.label }];
    });
    const correct = raw.correct.filter((id): id is string => typeof id === "string");
    if (options.length < 2 || correct.length === 0) return null;
    return { prompt: raw.prompt, mode, options, correct };
  } catch {
    return null;
  }
}

export function isLongForm(type: string, body: string | null): boolean {
  if (type === "blog") return true;
  return Boolean(body && body.length >= 700 && type === "ai_text");
}
