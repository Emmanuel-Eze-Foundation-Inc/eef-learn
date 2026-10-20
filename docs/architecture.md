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
- **The creator's model, never the platform's.** EEF Learn provides no AI credits. Each AI call runs on the user's own key (OpenRouter, OpenAI, Anthropic or Google, chosen in Settings and passed per request as `userModel`), or happens in the user's own AI client over MCP. `AI_PROVIDER=mock` gives keyless users deterministic output; `AI_MODEL_*` set OpenRouter per-task defaults.
- **Retrieval lives in one place.** The AI service `/retrieve` endpoint owns query embedding + hybrid search (pgvector + FTS, RRF). The TypeScript side never embeds. Every retrieval query is visibility-scoped.
- **Map versioning.** Regeneration bumps `Map.version`; node slugs are stable across regenerations; stale-version progress writes are rejected with a typed error (client shows a reload banner).
- **No usage limits.** The creator's key pays, so there are no quotas.

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
