/** Nested lesson tree + prerequisite DAG. Shared by web studio and travel. */

export type TreeNode = {
  id: string;
  parentId: string | null;
  order: number;
};

export type GraphLink = {
  fromId: string;
  toId: string;
  kind?: string;
};

export type SkeletonNode = {
  slug: string;
  title: string;
  order: number;
  parent?: string | null;
};

export type SkeletonEdge = {
  from: string;
  to: string;
  kind?: string;
};

export type MapBrief = {
  audience?: string;
  startingPoint?: string;
  depth?: string;
  notes?: string;
};

export function isMapBrief(value: unknown): value is MapBrief {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return ["audience", "startingPoint", "depth", "notes"].every(
    (key) => row[key] === undefined || typeof row[key] === "string",
  );
}

/** Depth-first pre-order: parent, then children by sibling `order`. This is travel order. */
export function flattenTree<T extends TreeNode>(nodes: T[]): T[] {
  const byParent = new Map<string | null, T[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  const result: T[] = [];
  const visit = (parentId: string | null) => {
    for (const child of byParent.get(parentId) ?? []) {
      result.push(child);
      visit(child.id);
    }
  };
  visit(null);
  return result;
}

export function nodeDepth(nodes: TreeNode[], id: string): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let depth = 0;
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.id)) return depth;
    seen.add(current.id);
    current = byId.get(current.parentId);
    depth += 1;
  }
  return depth;
}

export function parentErrors(nodes: TreeNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(nodes.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    if (!node.parentId) continue;
    if (node.parentId === node.id) {
      errors.push(`node '${node.id}' cannot be its own parent`);
      continue;
    }
    if (!ids.has(node.parentId)) {
      errors.push(`node '${node.id}' parent is missing`);
      continue;
    }
  }
  if (errors.length) return errors;

  for (const node of nodes) {
    const seen = new Set<string>();
    let current: TreeNode | undefined = node;
    while (current?.parentId) {
      if (seen.has(current.id)) {
        errors.push("parent tree contains a cycle");
        return errors;
      }
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  }
  return errors;
}

export function prerequisiteErrors(nodes: TreeNode[], edges: GraphLink[]): string[] {
  const errors: string[] = [];
  const known = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const node of nodes) {
    adj.set(node.id, []);
    indeg.set(node.id, 0);
  }

  edges
    .filter((e) => (e.kind ?? "prerequisite") === "prerequisite")
    .forEach((edge, i) => {
      if (!known.has(edge.fromId) || !known.has(edge.toId)) {
        errors.push(`edge[${i}] references unknown node`);
        return;
      }
      if (edge.fromId === edge.toId) {
        errors.push(`edge[${i}] is a self-loop`);
        return;
      }
      adj.get(edge.fromId)!.push(edge.toId);
      indeg.set(edge.toId, (indeg.get(edge.toId) ?? 0) + 1);
    });

  if (errors.length) return errors;

  const queue = [...known].filter((id) => (indeg.get(id) ?? 0) === 0);
  let seen = 0;
  while (queue.length) {
    const cur = queue.pop()!;
    seen += 1;
    for (const nxt of adj.get(cur) ?? []) {
      const nextDeg = (indeg.get(nxt) ?? 0) - 1;
      indeg.set(nxt, nextDeg);
      if (nextDeg === 0) queue.push(nxt);
    }
  }
  if (seen !== known.size) errors.push("prerequisite graph contains a cycle");
  return errors;
}

export function validateMapGraph(nodes: TreeNode[], edges: GraphLink[]): string[] {
  return [...parentErrors(nodes), ...prerequisiteErrors(nodes, edges)];
}

export function validateSkeleton(data: { nodes?: unknown; edges?: unknown }): string[] {
  const errors: string[] = [];
  const nodes = data.nodes;
  const edges = Array.isArray(data.edges) ? data.edges : [];

  if (!Array.isArray(nodes) || nodes.length < 2) {
    return ["skeleton must contain at least 2 nodes"];
  }

  const slugs: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = asRecord(nodes[i]);
    if (!n) {
      errors.push(`node[${i}] missing slug`);
      continue;
    }
    const slug = n.slug;
    if (!slug || typeof slug !== "string") {
      errors.push(`node[${i}] missing slug`);
      continue;
    }
    slugs.push(slug);
    if (!n.title || typeof n.title !== "string") errors.push(`node '${slug}' missing title`);
    if (typeof n.order !== "number" || !Number.isInteger(n.order)) {
      errors.push(`node '${slug}' missing integer order`);
    }
  }
  if (new Set(slugs).size !== slugs.length) errors.push("duplicate node slugs");

  const known = new Set(slugs);
  nodes.forEach((raw, i) => {
    const n = asRecord(raw);
    if (!n || typeof n.slug !== "string") return;
    const parent = n.parent;
    if (parent == null || parent === "") return;
    if (typeof parent !== "string") {
      errors.push(`node[${i}] parent must be a slug`);
      return;
    }
    if (parent === n.slug) errors.push(`node '${n.slug}' cannot be its own parent`);
    else if (!known.has(parent)) errors.push(`node '${n.slug}' parent is missing`);
  });

  const treeNodes: TreeNode[] = slugs.map((slug, i) => {
    const n = asRecord(nodes[i]);
    const parent = typeof n?.parent === "string" && n.parent ? n.parent : null;
    return { id: slug, parentId: parent, order: typeof n?.order === "number" ? n.order : i };
  });
  errors.push(...parentErrors(treeNodes));

  const links: GraphLink[] = [];
  edges.forEach((raw, i) => {
    const e = asRecord(raw);
    const from = e?.from;
    const to = e?.to;
    if (typeof from !== "string" || typeof to !== "string") {
      errors.push(`edge[${i}] references unknown node (${String(from)} -> ${String(to)})`);
      return;
    }
    if (!known.has(from) || !known.has(to)) {
      errors.push(`edge[${i}] references unknown node (${from} -> ${to})`);
      return;
    }
    if (from === to) {
      errors.push(`edge[${i}] is a self-loop on '${from}'`);
      return;
    }
    links.push({
      fromId: from,
      toId: to,
      kind: typeof e?.kind === "string" ? e.kind : "prerequisite",
    });
  });

  if (errors.length) return unique(errors);
  errors.push(...prerequisiteErrors(treeNodes, links));
  return unique(errors);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
