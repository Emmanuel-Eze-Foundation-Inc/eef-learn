# Architecture

Source design: [`docs/designs/eef-learn-platform.md`](designs/eef-learn-platform.md) (approved 2026-09-13).

```
┌──────────────┐     HTTPS      ┌──────────────────┐
│  apps/web    │ ─────────────▶ │  apps/ai         │
│  Next.js     │  bearer token  │  FastAPI (Python)│
│  (Vercel)    │                │  (Railway)       │
└──────┬───────┘                └────────┬─────────┘
       │                                 │
       │        ┌───────────────┐        │
       └──────▶ │   Postgres    │ ◀──────┘
                │   + pgvector  │
                │ (Neon/docker) │
                └───────────────┘
```

## Key decisions

- **Postgres is the coordination point.** The web app enqueues `GenerationJob` rows; the AI service claims them with `SELECT ... FOR UPDATE SKIP LOCKED`, heartbeats a lease, and writes append-only **checkpoints**.
- **Checkpoint polling is the primary realtime transport.** Clients poll a checkpoint endpoint with last-seen-id resume tokens. This survives serverless timeouts and Neon connection pooling. `LISTEN/NOTIFY` is a self-host-only optimization (signal-only; checkpoints re-read on reconnect).
- **One AI env contract for both services.** `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY` / `AI_BASE_URL` + per-task overrides (`AI_MODEL_SKELETON|SECTION|CHAT|ENRICH`). Mock is the default; OpenRouter is the hosted default.
- **Retrieval lives in one place.** The AI service `/retrieve` endpoint owns query embedding + hybrid search (pgvector + FTS, RRF). The TypeScript side never embeds. Every retrieval query is visibility-scoped.
- **Map versioning.** Regeneration bumps `Map.version`; node slugs are stable across regenerations; stale-version progress writes are rejected with a typed error (client shows a reload banner).
- **Quotas & spend** are enforced with atomic conditional decrements; spend is reserved at enqueue and reconciled at completion; failed generations refund quota.

## Package map

| Package | Owns |
|---|---|
| `apps/web` | UI, auth (Better Auth), map/section views, companion chat (Vercel AI SDK), checkpoint polling endpoints |
| `apps/ai` | Job worker, skeleton/section generation, YouTube enrichment, PDF import, embeddings, `/retrieve` |
| `packages/db` | Prisma schema, migrations, seed (demo map) |
| `packages/core` | Env contract, shared domain types |
| `packages/ui-tokens` | Aurora tokens (colors dark/light, radius, motion) |

## Deploy order

`migrate → deploy ai → deploy web`. The AI service boots with a schema-compatibility check and hard-fails on migration mismatch.
