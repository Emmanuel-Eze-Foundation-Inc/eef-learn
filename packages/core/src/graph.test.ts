import { describe, expect, it } from "vitest";

import {
  compassOf,
  flattenTree,
  graphNeighborIds,
  layoutTree,
  nearestNeighborInDirection,
  nodeDepth,
  parentErrors,
  prerequisiteErrors,
  resolvePositions,
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

describe("layoutTree", () => {
  it("places children below their parent", () => {
    const nodes = [n("a", 0), n("b", 0, "a"), n("c", 1)];
    const pos = layoutTree(nodes);
    expect(pos.get("b")!.y).toBeGreaterThan(pos.get("a")!.y);
    expect(pos.get("c")!.x).toBeGreaterThan(pos.get("a")!.x);
  });

  it("never overlaps sibling lessons", () => {
    const nodes = [n("a", 0), n("b", 1), n("b1", 0, "b"), n("b2", 1, "b"), n("b2a", 0, "b2"), n("c", 2)];
    const points = [...layoutTree(nodes).values()];
    expect(points).toHaveLength(nodes.length);
    points.forEach((p, i) =>
      points.slice(i + 1).forEach((q) => {
        expect(Math.abs(p.x - q.x) >= 280 || Math.abs(p.y - q.y) >= 100).toBe(true);
      }),
    );
  });

  it("centres a single root above its modules as the intro", () => {
    const pos = layoutTree([n("root", 0), n("m1", 0, "root"), n("m2", 1, "root")]);
    expect(pos.get("m1")!.y).toBe(pos.get("m2")!.y);
    expect(pos.get("root")!.y).toBeLessThan(pos.get("m1")!.y);
    expect(pos.get("root")!.x).toBe((pos.get("m1")!.x + pos.get("m2")!.x) / 2);
  });
});

describe("resolvePositions", () => {
  it("keeps stored coordinates", () => {
    const nodes = [{ ...n("a", 0), positionX: 10, positionY: 20 }];
    expect(resolvePositions(nodes).get("a")).toEqual({ x: 10, y: 20 });
  });
});

describe("graphNeighborIds", () => {
  it("includes parent, child, sibling, and prerequisite", () => {
    const nodes = [n("root", 0), n("a", 0, "root"), n("b", 1, "root"), n("c", 1)];
    const ids = graphNeighborIds("a", nodes, [{ fromId: "c", toId: "a" }]);
    expect(ids.sort()).toEqual(["b", "c", "root"]); // sibling b, prereq c, parent root
  });
});

describe("nearestNeighborInDirection", () => {
  it("picks the nearest graph neighbor in that compass", () => {
    expect(compassOf({ x: 0, y: 0 }, { x: 10, y: 1 })).toBe("right");
    const nodes = [
      { ...n("a", 0), positionX: 0, positionY: 0 },
      { ...n("b", 1, "a"), positionX: 0, positionY: 160 },
      { ...n("c", 2), positionX: 280, positionY: 0 },
    ];
    expect(nearestNeighborInDirection("a", "down", nodes, [])).toBe("b");
    expect(nearestNeighborInDirection("a", "right", nodes, [])).toBe("c");
  });
});
