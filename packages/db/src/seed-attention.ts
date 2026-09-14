/**
 * A real teaching map: how transformers pay attention.
 * Diverse beats (guide, YouTube, essay, paper extract, recall) so travel can
 * stream a complex idea instead of dumping mock paragraphs.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "attention-how-transformers-read";

type BeatSpec = {
  type: "youtube" | "blog" | "ai_text" | "pdf_extract" | "flashcard" | "quiz";
  title: string;
  body: string;
  url?: string;
  sourceName: string;
  sourceUrl?: string;
  sourceType: "youtube" | "blog" | "community_map" | "pdf";
};

type NodeSpec = {
  slug: string;
  title: string;
  beats: BeatSpec[];
};

const EMBEDDINGS_ESSAY = `Before a model can look back, it has to put every word on a map. That map is not a dictionary. It is geometry.

An embedding is a list of numbers — a direction in a high-dimensional space. You never see the axes. You only see what sits near what. "King" minus "man" plus "woman" landing near "queen" is not a party trick. It means similar uses sit in similar neighborhoods. The model did not learn a royal family tree. It learned that those words show up in the same kind of sentences, doing the same kind of work.

Think of a city at night. Each word is a window with the lights on. Words that keep each other company glow in the same district. "Trophy" and "suitcase" can live on the same block when the sentence is about packing, and on opposite hills when the sentence is about size. The embedding is the address. Attention is the walk you take from the window you are in to the windows you need to see.

That walk is why this essay is long. You cannot glance at a vector and know what it means. You have to live with the idea long enough that the next video does not feel like a magic trick. Grant will draw the arrows. Lilian will name the papers. This page is the street you stand on before either of them starts talking.

Here is the practical picture. The model reads a token and looks up a row in a giant table. That row is the embedding. Early in training the row is noise. After training the row is a habit: this token tends to keep this company. Subword pieces (the "##ing" of "running") share neighborhoods with other endings. Rare names sit out on the edge until a sentence pulls them in.

Nothing in that table is a definition. If you print the numbers they look like weather. The meaning is relational. You understand an embedding the way you understand a person in a room: by who they turn toward.

Attention will later ask a precise question: from this neighborhood, who nearby should I listen to? The query is the question. The keys are the other addresses, held up like billboards. The values are what those neighbors would contribute if chosen. High match, more of that payload. Low match, almost none. The embedding is what makes "match" possible. Without a shared space, a query and a key have nothing to take a dot product of.

A few things this picture gets wrong if you hold it too tightly.

First, the space is not two-dimensional, and the "districts" are not districts. Models use hundreds or thousands of dimensions. A word can be close to "size" on one slice and close to "container" on another. That is useful. It is also why a single analogy ("king − man + woman") is a postcard, not a proof.

Second, the first embedding is not the whole story. Each attention block rewrites the vector. "Sat" goes in as a verb-ish address and comes out as "this sitting, done by the cat, on the mat." The later layers are still lists of numbers. They are just lists that have already looked around.

Third, position is its own kind of address. Transformers add a position signal so that "the" at the start of the sentence is not the same point as "the" six words later. Without that, the city would have no streets — only a pile of glowing windows.

If you remember one paragraph from this star, remember this: embeddings turn tokens into points that can be compared. Attention is the comparison. The rest of the map is what that comparison looks like when you draw it, when you name the three vectors, and when you sit with a single sentence until the budget of attention has to add to one.

When you are ready, scroll. The next star is a film of the whole machine. Come back to this essay if the arrows feel abstract. The city will still be here.`;

const NODES: NodeSpec[] = [
  {
    slug: "the-sentence-looks-back",
    title: "A sentence has to look back",
    beats: [
      {
        type: "ai_text",
        title: "You already do attention",
        body:
          "Read: \"The trophy does not fit in the suitcase because it is too big.\" What is it?\n\nYou did not look up a rule. You looked back. The word \"big\" pulled \"trophy\" into focus and left \"suitcase\" dim. That look-back is attention. Transformers learned to do it with numbers instead of a narrator.",
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
      {
        type: "flashcard",
        title: "Hold the sentence still",
        body: JSON.stringify({
          front: "The trophy does not fit in the suitcase because it is too big. What is it — and why?",
          back: "The trophy. \"Big\" looks back and lights up trophy, not suitcase. That look-back is attention.",
        }),
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
    ],
  },
  {
    slug: "meaning-as-geometry",
    title: "Meaning as geometry",
    beats: [
      {
        type: "ai_text",
        title: "Words become arrows",
        body: EMBEDDINGS_ESSAY,
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
    ],
  },
  {
    slug: "watch-what-is-a-gpt",
    title: "Watch: what is a GPT",
    beats: [
      {
        type: "youtube",
        title: "But what is a GPT? Visual intro to transformers",
        body:
          "Grant Sanderson walks the whole machine once: tokens in, a stack of attention blocks, next-token out. Watch for the moment a token is allowed to see the tokens before it, and not the ones after. That is the constraint everything else is built on.",
        url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
        sourceName: "3Blue1Brown — But what is a GPT?",
        sourceUrl: "https://www.youtube.com/watch?v=wjZofJX0v4M",
        sourceType: "youtube",
      },
    ],
  },
  {
    slug: "query-key-value",
    title: "Query, key, value",
    beats: [
      {
        type: "ai_text",
        title: "Three copies of the same word",
        body:
          "For each token the model makes three vectors.\n\nThe query is the question: \"who should I listen to?\" The key is the billboard: \"this is what I am about.\" The value is the payload: \"if you pick me, here is what I contribute.\"\n\nAttention is a matching of questions to billboards. High match, more of that payload. Low match, almost none. Nothing mystical — a weighted average.",
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
      {
        type: "quiz",
        title: "Name the question",
        body: JSON.stringify({
          mode: "radio",
          prompt: "A token's query is best described as…",
          options: [
            { id: "a", label: "The payload you contribute if chosen" },
            { id: "b", label: "The question: who should I listen to?" },
            { id: "c", label: "The billboard: this is what I am about" },
          ],
          correct: ["b"],
        }),
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
      {
        type: "blog",
        title: "Lilian Weng: Attention? Attention!",
        body:
          "When you want the original survey — Bahdanau, transformers, self-attention, and the family of later tricks — this is the essay to keep. Come back after the next video. It will read faster.",
        url: "https://lilianweng.github.io/posts/2018-06-24-attention/",
        sourceName: "Lilian Weng — Attention? Attention!",
        sourceUrl: "https://lilianweng.github.io/posts/2018-06-24-attention/",
        sourceType: "blog",
      },
    ],
  },
  {
    slug: "watch-attention",
    title: "Watch: attention, visually",
    beats: [
      {
        type: "youtube",
        title: "Attention in transformers, visually explained",
        body:
          "This is the one idea, drawn. Watch the grid light up: each row is a token asking, each column is a token offering. The bright cells are the look-backs you did with \"it\" and \"trophy.\" Pause when he shows softmax. That is the moment the scores become a budget that has to add to one.",
        url: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
        sourceName: "3Blue1Brown — Attention in transformers",
        sourceUrl: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
        sourceType: "youtube",
      },
    ],
  },
  {
    slug: "one-token-all-the-others",
    title: "One token, all the others",
    beats: [
      {
        type: "ai_text",
        title: "Worked example: \"The cat sat on the mat\"",
        body:
          "Take the word sat. Its query is roughly: \"I am a verb. I need a subject, maybe a place.\"\n\ncat should score high (who sat). mat should score medium (where). the should score near zero. Softmax turns those scores into a budget, say 0.62 / 0.28 / 0.04 / …\n\nThe new vector for sat is that mix of the others' values. The word has been rewritten by who it looked at. Stack that block. Do it again. That stack is the transformer.",
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
      {
        type: "quiz",
        title: "Who should sat listen to?",
        body: JSON.stringify({
          mode: "multi",
          prompt: "When the word \"sat\" asks, which should get a high or medium score?",
          options: [
            { id: "cat", label: "cat — who sat" },
            { id: "mat", label: "mat — where" },
            { id: "the", label: "the — little grammatical glue" },
            { id: "only", label: "sat attending only to itself" },
          ],
          correct: ["cat", "mat"],
        }),
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
    ],
  },
  {
    slug: "why-this-unlocked-the-decade",
    title: "Why this unlocked the decade",
    beats: [
      {
        type: "pdf_extract",
        title: "Vaswani et al., 2017 — the claim",
        body:
          "\"We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.\"\n\nThe point was speed and reach. Recurrence forced the model to wait on the previous step. Attention lets every token look at every earlier token in parallel. That is why these models could grow.",
        sourceName: "Vaswani et al. — Attention Is All You Need (2017)",
        sourceUrl: "https://arxiv.org/abs/1706.03762",
        sourceType: "pdf",
      },
      {
        type: "ai_text",
        title: "What to carry out of this map",
        body:
          "If you remember one sentence: a transformer rewrites each token as a weighted mix of the tokens it is allowed to see.\n\nGPT-style models only look left (the past). Translation models may look at the other sentence too. Same mechanism, different mask.\n\nThe next star, if you want it, is multi-head attention: several of these look-backs at once, so one head can track grammar while another tracks names.",
        sourceName: "EEF Learn guide",
        sourceType: "blog",
      },
    ],
  },
];

async function main() {
  const creator =
    (await prisma.user.findUnique({ where: { email: "qa-ui@test.local" } })) ??
    (await prisma.user.findUnique({ where: { email: "demo@eeflearn.local" } })) ??
    (await prisma.user.findFirst());
  if (!creator) throw new Error("No user to own the attention map. Sign up once, then re-run.");

  const map = await prisma.map.upsert({
    where: { slug: SLUG },
    update: {
      title: "Attention: how transformers read",
      topic: "How transformers pay attention",
      visibility: "public",
      generationEnabled: false,
    },
    create: {
      slug: SLUG,
      title: "Attention: how transformers read",
      topic: "How transformers pay attention",
      visibility: "public",
      generationEnabled: false,
      creatorId: creator.id,
    },
  });

  const existing = await prisma.node.findMany({ where: { mapId: map.id } });
  for (const node of existing) {
    await prisma.contentBlock.deleteMany({ where: { nodeId: node.id } });
  }
  await prisma.edge.deleteMany({ where: { mapId: map.id } });
  await prisma.node.deleteMany({ where: { mapId: map.id } });

  for (const [order, spec] of NODES.entries()) {
    const node = await prisma.node.create({
      data: { mapId: map.id, slug: spec.slug, title: spec.title, order },
    });
    for (const [blockIndex, beat] of spec.beats.entries()) {
      const block = await prisma.contentBlock.create({
        data: {
          nodeId: node.id,
          blockIndex,
          type: beat.type,
          title: beat.title,
          body: beat.body,
          url: beat.url ?? null,
          provenanceModel: beat.type === "ai_text" ? "authored-guide" : null,
          provenancePromptHash: "attention-map-v2",
          provenanceSourceIds: [],
          mapVersion: 1,
        },
      });
      await prisma.attribution.create({
        data: {
          contentBlockId: block.id,
          sourceType: beat.sourceType,
          sourceName: beat.sourceName,
          sourceUrl: beat.sourceUrl ?? beat.url ?? null,
        },
      });
    }
  }

  console.log(`Seeded ${SLUG} as ${creator.email}`);
  console.log(`Open /maps/${SLUG}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
