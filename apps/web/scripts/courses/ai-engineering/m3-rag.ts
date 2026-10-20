import { card, code, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m3: LessonSpec = {
  slug: "retrieval",
  title: "Retrieval: giving models your knowledge",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `Models do not know your documents, your product or anything after their cutoff. **Retrieval-augmented generation (RAG)** fixes that: find the relevant passages first, put them in the context, then ask the model to answer from them.

You will learn how embeddings turn text into searchable vectors, build a complete RAG pipeline on Postgres with pgvector, and then make retrieval genuinely good with hybrid search, reranking and contextual chunking. RAG is the most common pattern in production AI, so this module is worth doing carefully.`,
    },
  ],
  lessons: [
    {
      slug: "embeddings",
      title: "Embeddings and vector search",
      blocks: [
        {
          type: "ai_text",
          title: "Meaning as coordinates",
          body: `An **embedding** is a list of numbers (a vector, often 384 to 3,072 of them) that represents the meaning of a piece of text. An embedding model is trained so that texts with similar meaning land close together. "How do I reset my password?" and "I forgot my login" end up near each other even though they share no words.

**Measuring closeness.** The usual measure is **cosine similarity**: 1 means pointing the same way (same meaning), around 0 means unrelated. Many libraries return *distance* instead (1 − similarity), so smaller is closer. Check which one you are reading.

**Semantic search in four steps**
1. Split your documents into chunks.
2. Embed every chunk once and store the vectors.
3. When a question comes in, embed the question with **the same model**.
4. Return the chunks whose vectors are closest to the question's vector.

**Where to store vectors.** A **vector database** indexes vectors so nearest-neighbour search stays fast across millions of rows. Options include dedicated databases (Pinecone, Weaviate, Qdrant) and extensions to databases you already run. **pgvector** adds a \`vector\` column type and similarity operators to Postgres, which means your vectors live next to your normal data, in the same transactions and backups. For most products up to many millions of chunks, it is the simplest good choice. (This learning platform uses it.)

**Indexes.** Exact search compares the question to every vector, which gets slow. Approximate indexes such as **HNSW** trade a tiny amount of accuracy for large speed-ups. Add one once you have more than tens of thousands of rows.

**Things that bite people**
- Mixing embedding models: vectors from different models are not comparable. If you change models, re-embed everything.
- Embedding huge chunks: one vector for a 20-page document blurs its meaning. Chunk first.
- Forgetting metadata: store the source, title, date and permissions with each chunk so you can filter and cite.`,
        },
        {
          type: "youtube",
          title: "What are word embeddings?",
          url: "https://www.youtube.com/watch?v=wgfSDrqYMJ4",
          body: "IBM Technology on how words and sentences become vectors and why similar meanings sit close together. Short and visual.",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=wgfSDrqYMJ4" },
        },
        {
          type: "youtube",
          title: "What is a vector database?",
          url: "https://www.youtube.com/watch?v=gl1r1XV0SLw",
          body: "How vector databases store embeddings and run similarity search, and where they fit in an AI application.",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=gl1r1XV0SLw" },
        },
        tutorial(
          "MJHUVUXBRFE",
          "pgvector for Python developers",
          "Microsoft Developer",
          "Pamela Fox goes from what a vector is to storing embeddings in Postgres, querying with distance operators, adding HNSW indexes and searching from Python, with live demos. Follow along with a local Postgres (Docker is easiest) and the similarity.py example below.",
        ),
        {
          type: "code",
          title: "similarity.py",
          body: code(
            "python",
            `
import math, os
from openai import OpenAI

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

def embed(texts: list[str]) -> list[list[float]]:
    result = client.embeddings.create(model="openai/text-embedding-3-small", input=texts)
    return [item.embedding for item in result.data]

def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

question, *docs = embed([
    "How do I reset my password?",
    "Forgot your login? Use the 'Reset' link on the sign-in page.",
    "Our office is closed on public holidays.",
])
for doc in docs:
    print(round(cosine(question, doc), 3))  # the first score should be clearly higher
`,
          ),
        },
        {
          type: "resource",
          title: "pgvector",
          url: "https://github.com/pgvector/pgvector",
          body: "The Postgres extension for vector similarity search. The README covers installing it, the vector column type, distance operators and HNSW indexes.",
          source: { type: "resource", name: "pgvector", url: "https://github.com/pgvector/pgvector" },
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Embedding", "A vector of numbers representing a text's meaning, so that similar meanings are close together."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "You switched to a newer embedding model for incoming questions, and search results became nonsense. Why?",
            [
              "The new model has a smaller context window",
              "The stored document vectors came from the old model, and vectors from different models are not comparable",
              "Cosine similarity only works with one provider",
              "The HNSW index needs a higher temperature",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "rag-pipeline",
      title: "Build a RAG pipeline",
      blocks: [
        {
          type: "ai_text",
          title: "Ingest, retrieve, generate",
          body: `A RAG system has two halves.

**Ingestion (offline, runs when documents change)**
1. **Load** documents: PDFs, web pages, help-centre articles, database rows.
2. **Clean** them: strip navigation, headers, footers and boilerplate.
3. **Chunk** them. A good default is 300 to 800 tokens per chunk with a small overlap (10 to 15%), splitting on headings and paragraphs rather than mid-sentence.
4. **Embed** each chunk and **store** it with metadata: source URL, title, section, updated date, and who is allowed to see it.

**Query (online, runs per question)**
1. Embed the question.
2. Retrieve the top *k* chunks (start with 5 to 10), filtered by metadata such as the user's permissions.
3. Build the prompt: instructions, the chunks (each labelled with its source), then the question.
4. Generate an answer that **cites its sources**, and tells the user when the documents do not contain the answer.

**The prompt that makes RAG trustworthy**
> Answer using only the sources below. Cite each claim with its source number, like [2]. If the sources do not answer the question, say "I couldn't find that in the documentation" and do not guess.

**Permissions are not optional.** If a user may not see a document, its chunks must be filtered out *before* they reach the model. The model will happily repeat whatever is in its context.

**Keep ingestion incremental.** Store a hash of each document; re-chunk and re-embed only what changed. Delete chunks when their source is deleted, or the model will keep quoting retired policies.

**When RAG fails, check retrieval first.** Most bad RAG answers come from the wrong chunks being retrieved, not from the model. Log which chunks were used for each answer so you can tell.`,
        },
        {
          type: "youtube",
          title: "What is retrieval-augmented generation?",
          url: "https://www.youtube.com/watch?v=T-D1OfcDW1M",
          body: "IBM Research's clear explanation of why RAG exists: keeping answers current and grounded in sources. Watch for the two problems it solves (out-of-date knowledge and no sources).",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=T-D1OfcDW1M" },
        },
        tutorial(
          "2TJxpyO3ei4",
          "Build a RAG app for your PDFs",
          "pixegami",
          "A complete, beginner-friendly build: load PDFs, chunk them, embed them, store them, answer questions with sources, and test the answers. Use your own documents (a manual, a policy, your course notes) instead of the demo files.",
        ),
        tutorial(
          "sVcwVQRHIc8",
          "RAG from scratch, in depth",
          "freeCodeCamp.org",
          "A longer course from a LangChain engineer covering indexing, retrieval, query translation, routing and advanced RAG patterns, each with a short coding session. Work through it section by section alongside the next lesson.",
          { optional: true },
        ),
        {
          type: "code",
          title: "rag.py (Postgres + pgvector)",
          body: code(
            "python",
            `
# Setup (once):
#   CREATE EXTENSION IF NOT EXISTS vector;
#   CREATE TABLE chunks (id bigserial PRIMARY KEY, source text, content text, embedding vector(1536));
#   CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
import os
import psycopg
from openai import OpenAI

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])
db = psycopg.connect(os.environ["DATABASE_URL"])

def embed(text: str) -> str:
    vector = client.embeddings.create(model="openai/text-embedding-3-small", input=text).data[0].embedding
    return "[" + ",".join(map(str, vector)) + "]"

def ingest(source: str, chunks: list[str]) -> None:
    with db.cursor() as cur:
        for chunk in chunks:
            cur.execute("INSERT INTO chunks (source, content, embedding) VALUES (%s, %s, %s)", (source, chunk, embed(chunk)))
    db.commit()

def answer(question: str, k: int = 5) -> str:
    rows = db.execute(
        "SELECT source, content FROM chunks ORDER BY embedding <=> %s::vector LIMIT %s",
        (embed(question), k),
    ).fetchall()
    sources = "\\n\\n".join(f"[{i + 1}] ({src})\\n{text}" for i, (src, text) in enumerate(rows))
    prompt = (
        "Answer using only the sources below and cite them like [1]. "
        "If they do not answer the question, say you couldn't find it.\\n\\n"
        f"<sources>\\n{sources}\\n</sources>\\n\\nQuestion: {question}"
    )
    reply = client.chat.completions.create(
        model="openai/gpt-4o-mini", temperature=0, messages=[{"role": "user", "content": prompt}]
    )
    return reply.choices[0].message.content
`,
          ),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "A RAG assistant gives a wrong answer. What should you look at first?",
            [
              "Swap to a bigger model",
              "Which chunks were retrieved for that question",
              "Increase the temperature",
              "Rewrite the user's question",
            ],
            [1],
          ),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Where must document permissions be enforced in a RAG system?",
            [
              "In the prompt, by telling the model not to reveal private documents",
              "At retrieval time, so unauthorised chunks never reach the model",
              "Only in the frontend",
              "They don't matter because embeddings are anonymous",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "better-retrieval",
      title: "Making retrieval good",
      blocks: [
        {
          type: "ai_text",
          title: "From working to excellent",
          body: `Basic vector search gets you a demo. These techniques get you a product. Add them one at a time and measure each (Module 5), because each adds cost and complexity.

**1. Hybrid search.** Vector search is good at meaning but weak at exact terms: product codes, error messages, names. Classic keyword search (BM25, or Postgres full-text search) is the opposite. Run both and merge the results, for example with *reciprocal rank fusion*. This is one of the highest-value upgrades.

**2. Reranking.** Retrieve a wide set (say 50 chunks) cheaply, then use a **reranker** (a model that scores each question–chunk pair directly) to pick the best 5. Rerankers are slower per item but much more accurate than embedding distance alone.

**3. Contextual chunks.** A chunk like "Revenue grew 3% over the previous quarter" is useless without knowing which company and which quarter. Prepend a short summary of where the chunk sits in its document before embedding it. Anthropic reported this cut retrieval failures substantially, and more when combined with hybrid search and reranking.

**4. Query rewriting.** Users ask vague or multi-part questions. Have a model rewrite the question into one or more clear search queries first, or split "compare plan A and plan B" into two searches.

**5. Metadata filters.** If the question is about 2026 pricing, filter by date and document type before ranking. Filters are cheap and precise.

**6. Agentic RAG.** Instead of one fixed retrieval step, give the model a search tool and let it decide what to search for, look at the results, and search again if needed. More flexible for complex questions; slower and harder to predict. Use it when single-shot retrieval is not enough.

**Measure retrieval separately from answers.** Build a list of questions with the chunk(s) that *should* be found, and track *recall@k* (how often the right chunk is in the top k). If retrieval recall is low, no prompt will save the answer.`,
        },
        {
          type: "blog",
          title: "Introducing contextual retrieval",
          url: "https://www.anthropic.com/news/contextual-retrieval",
          body: "Anthropic's write-up of contextual embeddings plus contextual BM25 and reranking, with measured reductions in failed retrievals. Read it for the recipe and for how they measured it.",
          source: { type: "blog", name: "Anthropic", url: "https://www.anthropic.com/news/contextual-retrieval" },
        },
        tutorial(
          "XvKiTfd6Xvo",
          "Hybrid search with BM25, embeddings and a reranker",
          "Dave Ebbelaar",
          "Build a production-style retriever step by step on a real finance Q&A dataset: BM25, dense embeddings, reciprocal rank fusion, then a reranker. It ends by scoring all four with NDCG@10. This is the lesson's ideas measured, which is exactly the habit to copy.",
        ),
        {
          type: "youtube",
          title: "What is agentic RAG?",
          url: "https://www.youtube.com/watch?v=0z9_MhcYvcY",
          body: "How giving an agent retrieval tools differs from a fixed RAG pipeline, and when the extra flexibility is worth it.",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=0z9_MhcYvcY" },
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Hybrid search", "Combining vector (semantic) search with keyword search such as BM25, then merging the rankings."),
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Reranker", "A model that scores each question–chunk pair directly; used to reorder a wide first-pass retrieval into a precise top few."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Users searching for error code \"E-4021\" get unrelated results from your vector search. What fixes this most directly?",
            ["A bigger embedding model", "Adding keyword search and merging it with vector results (hybrid search)", "Longer chunks", "A higher temperature"],
            [1],
          ),
        },
      ],
    },
  ],
};
