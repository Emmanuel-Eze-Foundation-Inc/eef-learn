/** Model providers a user can bring a key for. The AI service holds each one's endpoint. */
export const AI_PROVIDERS = {
  openrouter: {
    label: "OpenRouter",
    keyPrefix: "sk-or-",
    placeholder: "sk-or-…",
    keyUrl: "https://openrouter.ai/keys",
    defaultModel: "openai/gpt-4o-mini",
    note: "One key for hundreds of models, with web search during research.",
  },
  openai: {
    label: "OpenAI",
    keyPrefix: "sk-",
    placeholder: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-5.6-terra",
    note: "GPT models, billed to your OpenAI account.",
  },
  anthropic: {
    label: "Anthropic",
    keyPrefix: "sk-ant-",
    placeholder: "sk-ant-…",
    keyUrl: "https://platform.claude.com/settings/keys",
    defaultModel: "claude-sonnet-5-5",
    note: "Claude models, billed to your Anthropic account.",
  },
  google: {
    label: "Google Gemini",
    keyPrefix: "AIza",
    placeholder: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-3.8-flash",
    note: "Gemini models, billed to your Google AI Studio account.",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as [AiProvider, ...AiProvider[]];

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && value in AI_PROVIDERS;
}

/** A plain-language reason the key can't be right for the provider, or null. */
export function aiKeyProblem(provider: AiProvider, key: string): string | null {
  const meta = AI_PROVIDERS[provider];
  if (key.length < 20 || key.length > 256) return `That doesn't look like a full ${meta.label} key.`;
  if (!key.startsWith(meta.keyPrefix)) return `${meta.label} keys start with ${meta.keyPrefix}.`;
  if (provider === "openai" && key.startsWith("sk-or-")) return "That's an OpenRouter key. Choose OpenRouter as the provider.";
  if (provider === "openai" && key.startsWith("sk-ant-")) return "That's an Anthropic key. Choose Anthropic as the provider.";
  return null;
}

/** The provider a pasted key most likely belongs to. */
export function guessAiProvider(key: string): AiProvider | null {
  if (key.startsWith("sk-or-")) return "openrouter";
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza")) return "google";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

/** The error code AI routes answer with when the user hasn't connected their own AI. */
export const MODEL_REQUIRED = "model_required";
