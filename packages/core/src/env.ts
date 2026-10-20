import { z } from "zod";

const DOCS =
  "https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn/blob/main/docs/self-hosting.md";

/**
 * Shared AI env contract (identical names in apps/ai settings.py).
 * The platform holds no model key: every AI call runs on the user's own key.
 * AI_PROVIDER=mock lets keyless users get deterministic output (local dev, demos);
 * any other value means real models only, on keys users bring.
 */
export const aiProviderEnvSchema = z.object({
  AI_PROVIDER: z
    .enum(["mock", "openrouter", "openai", "anthropic", "google", "openai-compatible"])
    .default("mock"),
  AI_MODEL: z.string().default("mock-model"),
  AI_MODEL_SKELETON: z.string().optional(),
  AI_MODEL_SECTION: z.string().optional(),
  AI_MODEL_CHAT: z.string().optional(),
  AI_MODEL_ENRICH: z.string().optional(),
  EMBEDDINGS_MODEL: z.string().default("mock-embeddings"),
  EMBEDDINGS_DIMENSIONS: z.coerce.number().int().positive().default(768),
});

export const webEnvSchema = aiProviderEnvSchema.extend({
  DATABASE_URL: z
    .string()
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: `DATABASE_URL must be a postgres:// URL. fix: run \`docker compose up postgres\` and copy from .env.example. docs: ${DOCS}#database`,
    }),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_SERVICE_TOKEN: z.string().min(1, {
    message: `AI_SERVICE_TOKEN is required (any shared secret string; must match apps/ai). docs: ${DOCS}#service-auth`,
  }),
  AUTH_SECRET: z.string().min(16, {
    message: `AUTH_SECRET must be >=16 chars. fix: \`openssl rand -hex 32\`. docs: ${DOCS}#auth`,
  }),
  AUTH_EMAIL_VERIFICATION: z.enum(["on", "off"]).default("on"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
  SMTP_URL: z.string().optional(), // e.g. smtp://localhost:1025 (Mailpit); unset = log links to console
  EMAIL_FROM: z.string().default("EEF Learn <no-reply@eeflearn.local>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

/**
 * Boot-time env validation with the operator error contract:
 * problem + cause + fix + docs link per invalid var.
 */
export function loadWebEnv(source: NodeJS.ProcessEnv = process.env): WebEnv {
  const parsed = webEnvSchema.safeParse(source);
  if (!parsed.success) {
    const lines = [
      "",
      "=".repeat(72),
      "EEF Learn web cannot start: invalid environment",
      "=".repeat(72),
    ];
    for (const issue of parsed.error.issues) {
      const varName = issue.path.join(".") || "?";
      lines.push(`\nproblem: ${varName} — ${issue.message}`);
      if (issue.code === "invalid_type" && issue.message.includes("Required")) {
        lines.push(`  cause: ${varName} is not set`);
        lines.push(`  fix:   add ${varName}=... to .env (see .env.example)`);
      }
      lines.push(`  docs:  ${DOCS}`);
    }
    throw new Error(lines.join("\n"));
  }
  return parsed.data;
}

/** Per-task model routing with fallback to AI_MODEL (gate T-2: OpenRouter per-task routing). */
export function modelFor(
  env: Pick<WebEnv, "AI_MODEL" | "AI_MODEL_SKELETON" | "AI_MODEL_SECTION" | "AI_MODEL_CHAT" | "AI_MODEL_ENRICH">,
  task: "skeleton" | "section" | "chat" | "enrich",
): string {
  const map = {
    skeleton: env.AI_MODEL_SKELETON,
    section: env.AI_MODEL_SECTION,
    chat: env.AI_MODEL_CHAT,
    enrich: env.AI_MODEL_ENRICH,
  } as const;
  return map[task] ?? env.AI_MODEL;
}
