import { describe, expect, it } from "vitest";

import { slugifyTopic, titleFromTopic } from "./slug";

describe("slugifyTopic", () => {
  it("kebab-cases with suffix", () => {
    expect(slugifyTopic("Linear Algebra!", "abc123")).toBe("linear-algebra-abc123");
  });
  it("handles unicode and symbols", () => {
    expect(slugifyTopic("Café & Théorie", "x")).toBe("cafe-theorie-x");
  });
  it("falls back for empty topics", () => {
    expect(slugifyTopic("!!!", "x")).toBe("map-x");
  });
  it("caps length", () => {
    const slug = slugifyTopic("a".repeat(100), "x");
    expect(slug.length).toBeLessThanOrEqual(50 + 2);
  });
});

describe("titleFromTopic", () => {
  it("capitalizes", () => {
    expect(titleFromTopic("  rust programming ")).toBe("Rust programming");
  });
});
