/**
 * Seed: the demo moment. A ready-to-explore "Linear Algebra" map so a fresh
 * clone shows a real constellation without any API keys (mock provider).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: "demo@eeflearn.local" },
    update: {},
    create: {
      email: "demo@eeflearn.local",
      name: "Demo Learner",
      birthdate: new Date("2000-01-01"),
      emailVerified: true,
    },
  });

  const map = await prisma.map.upsert({
    where: { slug: "linear-algebra-demo" },
    update: {},
    create: {
      slug: "linear-algebra-demo",
      title: "Linear Algebra",
      topic: "Linear Algebra",
      visibility: "public",
      creatorId: demo.id,
    },
  });

  const nodeSpecs = [
    { slug: "vectors", title: "Vectors", order: 0 },
    { slug: "matrices", title: "Matrices", order: 1 },
    { slug: "matrix-multiplication", title: "Matrix multiplication", order: 2 },
    { slug: "determinants", title: "Determinants", order: 3 },
    { slug: "eigenvectors", title: "Eigenvectors", order: 4 },
  ];

  const nodes: Record<string, string> = {};
  for (const spec of nodeSpecs) {
    const node = await prisma.node.upsert({
      where: { mapId_slug: { mapId: map.id, slug: spec.slug } },
      update: {},
      create: { ...spec, mapId: map.id },
    });
    nodes[spec.slug] = node.id;
  }

  const edgeSpecs = [
    ["vectors", "matrices"],
    ["matrices", "matrix-multiplication"],
    ["matrix-multiplication", "determinants"],
    ["determinants", "eigenvectors"],
  ] as const;

  for (const [from, to] of edgeSpecs) {
    await prisma.edge.upsert({
      where: {
        mapId_fromId_toId_kind: {
          mapId: map.id,
          fromId: nodes[from],
          toId: nodes[to],
          kind: "prerequisite",
        },
      },
      update: {},
      create: { mapId: map.id, fromId: nodes[from], toId: nodes[to] },
    });
  }

  const block = await prisma.contentBlock.upsert({
    where: {
      nodeId_blockIndex_mapVersion: {
        nodeId: nodes["eigenvectors"],
        blockIndex: 0,
        mapVersion: 1,
      },
    },
    update: {},
    create: {
      nodeId: nodes["eigenvectors"],
      blockIndex: 0,
      type: "ai_text",
      title: "Why eigenvectors matter",
      body:
        "An eigenvector of a matrix is a direction the matrix does not rotate; " +
        "it only stretches or squashes it. That single idea powers PageRank, PCA, " +
        "and the stability of every bridge you have crossed.",
      provenanceModel: "mock-model",
      provenancePromptHash: "seed",
      provenanceSourceIds: [],
      mapVersion: 1,
    },
  });

  await prisma.attribution.upsert({
    where: { id: `${block.id}-seed` },
    update: {},
    create: {
      id: `${block.id}-seed`,
      contentBlockId: block.id,
      sourceType: "youtube",
      sourceName: "3Blue1Brown — Eigenvectors and eigenvalues",
      sourceUrl: "https://www.youtube.com/watch?v=PFDu9oVAE-g",
    },
  });

  console.log("Seeded demo map: /map/linear-algebra-demo");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
