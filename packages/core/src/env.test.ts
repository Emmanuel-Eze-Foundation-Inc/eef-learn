import { describe, expect, it } from "vitest";

import { loadWebEnv, modelFor } from "./env.js";

const base = {
  DATABASE_URL: "postgresql://eef:eef@localhost:5432/eef_learn",
  AI_SERVICE_TOKEN: "dev-token",
  AUTH_SECRET: "0123456789abcdef0123456789abcdef",
};

describe("loadWebEnv", () => {
  it("accepts a minimal mock-provider env", () => {
    const env = loadWebEnv(base as NodeJS.ProcessEnv);
    expect(env.AI_PROVIDER).toBe("mock");
    expect(env.EMBEDDINGS_DIMENSIONS).toBe(768);
  });

  it("fails with operator contract when DATABASE_URL missing", () => {
    const { DATABASE_URL: _omit, ...rest } = base;
    expect(() => loadWebEnv(rest as NodeJS.ProcessEnv)).toThrowError(/DATABASE_URL/);
  });

  it("requires AI_API_KEY for non-mock providers", () => {
    expect(() =>
      loadWebEnv({ ...base, AI_PROVIDER: "openrouter" } as NodeJS.ProcessEnv),
    ).toThrowError(/AI_API_KEY/);
  });
});

describe("modelFor", () => {
  it("falls back to AI_MODEL", () => {
    const env = loadWebEnv(base as NodeJS.ProcessEnv);
    expect(modelFor(env, "chat")).toBe("mock-model");
  });

  it("uses per-task override when present", () => {
    const env = loadWebEnv({
      ...base,
      AI_MODEL_CHAT: "anthropic/claude-sonnet",
    } as NodeJS.ProcessEnv);
    expect(modelFor(env, "chat")).toBe("anthropic/claude-sonnet");
    expect(modelFor(env, "skeleton")).toBe("mock-model");
  });
});
