import { slugifyTopic, validateMapGraph, type TreeNode, type GraphLink } from "@eef/core";
import { prisma } from "@eef/db";
import { NextResponse } from "next/server";

export function problem(status: number, error: string, cause?: string, fix?: string) {
  return NextResponse.json({ error, cause, fix }, { status });
}

export async function requireCreatorMap(mapId: string, userId: string) {
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { nodes: true, edges: true },
  });
  if (!map) return { map: null, error: problem(404, "not found") };
  if (map.creatorId !== userId) {
    return { map: null, error: problem(403, "only the creator can edit this map") };
  }
  return { map, error: null };
}

export function graphFromRows(
  nodes: { id: string; parentId: string | null; order: number }[],
  edges: { fromId: string; toId: string; kind: string }[],
): { nodes: TreeNode[]; edges: GraphLink[] } {
  return {
    nodes: nodes.map((n) => ({ id: n.id, parentId: n.parentId, order: n.order })),
    edges: edges.map((e) => ({ fromId: e.fromId, toId: e.toId, kind: e.kind })),
  };
}

export function graphProblems(
  nodes: { id: string; parentId: string | null; order: number }[],
  edges: { fromId: string; toId: string; kind: string }[],
): string[] {
  const g = graphFromRows(nodes, edges);
  return validateMapGraph(g.nodes, g.edges);
}

export async function uniqueNodeSlug(mapId: string, title: string): Promise<string> {
  const base = slugifyTopic(title, "").replace(/-$/, "") || "lesson";
  let slug = base;
  let n = 2;
  while (await prisma.node.findUnique({ where: { mapId_slug: { mapId, slug } } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export function publicHttpUrlError(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "That URL is not valid.";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Only http(s) URLs can be saved.";
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)
  ) {
    return "The URL must be a public address.";
  }
  return null;
}

export async function bumpMapVersion(mapId: string) {
  return prisma.map.update({
    where: { id: mapId },
    data: { version: { increment: 1 } },
  });
}
