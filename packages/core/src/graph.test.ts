import { describe, expect, it } from "vitest";

import {
  flattenTree,
  nodeDepth,
  parentErrors,
  prerequisiteErrors,
  validateSkeleton,
} from "./graph";

const n = (id: string, order: number, parentId: string | null = null) => ({
  id,
  parentId,
  order,
});

describe("flattenTree", () => {
  it("walks parent then children by sibling order", () => {
    const nodes = [
      n("practice", 2),
      n("core-b", 1, "core"),
      n("foundations", 0),
      n("core", 1),
      n("core-a", 0, "core"),
    ];
    expect(flattenTree(nodes).map((x) => x.id)).toEqual([
      "foundations",
      "core",
      "core-a",
      "core-b",
      "practice",
    ]);
  });

  it("walks grandchildren after their parent", () => {
    const nodes = [n("a", 0), n("b", 0, "a"), n("c", 0, "b"), n("d", 1)];
    expect(flattenTree(nodes).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("nodeDepth", () => {
  it("counts ancestors", () => {
    const nodes = [n("a", 0), n("b", 0, "a"), n("c", 0, "b")];
    expect(nodeDepth(nodes, "a")).toBe(0);
    expect(nodeDepth(nodes, "b")).toBe(1);
    expect(nodeDepth(nodes, "c")).toBe(2);
  });
});

describe("parentErrors", () => {
  it("rejects a self-parent", () => {
    expect(parentErrors([n("a", 0, "a")])).toContain("node 'a' cannot be its own parent");
  });

  it("rejects a missing parent", () => {
    expect(parentErrors([n("a", 0, "ghost")])).toContain("node 'a' parent is missing");
  });

  it("rejects a parent cycle", () => {
    expect(parentErrors([n("a", 0, "b"), n("b", 0, "a")])).toContain("parent tree contains a cycle");
  });

  it("accepts a two-level tree", () => {
    expect(parentErrors([n("a", 0), n("b", 0, "a"), n("c", 0, "b")])).toEqual([]);
  });
});

describe("prerequisiteErrors", () => {
  it("rejects a cycle", () => {
    const nodes = [n("a", 0), n("b", 1)];
    expect(
      prerequisiteErrors(nodes, [
        { fromId: "a", toId: "b" },
        { fromId: "b", toId: "a" },
      ]),
    ).toContain("prerequisite graph contains a cycle");
  });

  it("ignores non-prerequisite kinds", () => {
    const nodes = [n("a", 0), n("b", 1)];
    expect(
      prerequisiteErrors(nodes, [
        { fromId: "a", toId: "b", kind: "contains" },
        { fromId: "b", toId: "a", kind: "contains" },
      ]),
    ).toEqual([]);
  });
});

describe("validateSkeleton", () => {
  it("accepts a nested DAG", () => {
    expect(
      validateSkeleton({
        nodes: [
          { slug: "foundations", title: "Foundations", order: 0 },
          { slug: "core", title: "Core", order: 1 },
          { slug: "core-a", title: "Core A", order: 0, parent: "core" },
          { slug: "core-b", title: "Core B", order: 1, parent: "core" },
        ],
        edges: [{ from: "foundations", to: "core", kind: "prerequisite" }],
      }),
    ).toEqual([]);
  });

  it("rejects a short list", () => {
    expect(validateSkeleton({ nodes: [{ slug: "a", title: "A", order: 0 }] })).toEqual([
      "skeleton must contain at least 2 nodes",
    ]);
  });

  it("rejects an unknown parent slug", () => {
    const errors = validateSkeleton({
      nodes: [
        { slug: "a", title: "A", order: 0 },
        { slug: "b", title: "B", order: 1, parent: "ghost" },
      ],
    });
    expect(errors.some((e) => e.includes("parent is missing"))).toBe(true);
  });
});
