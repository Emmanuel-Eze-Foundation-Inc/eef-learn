# Self-hosting EEF Learn

One command, no API keys:

```bash
docker compose up
```

Web: http://localhost:3000 · AI service: http://localhost:8000/health · Mail UI: http://localhost:8025

The stack boots Postgres (pgvector), runs migrations + demo seed, then starts the AI service and web. Default provider is `mock` — everything works deterministically with zero spend.

## Environment reference

This is the canonical env-var table. The same `AI_*` names configure **both** services.

### Database

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://eef:eef@localhost:5432/eef_learn` | Must be Postgres with the `vector` extension available. |

**Common error — pgvector missing:** `ERROR: extension "vector" is not available`. Cause: plain postgres image. Fix: use `pgvector/pgvector:pg17` (compose default) or install pgvector on your server.

### Service auth

| Var | Notes |
|---|---|
| `AI_SERVICE_TOKEN` | Shared bearer secret, identical in web and ai. |
| `AI_SERVICE_TOKEN_NEXT` | Optional second token accepted during rotation: set NEXT everywhere, flip primary, clear NEXT. |
| `AI_SERVICE_URL` | Where web reaches the AI service (`http://ai:8000` inside compose). |

### Auth

| Var | Default | Notes |
|---|---|---|
| `AUTH_SECRET` | — | `openssl rand -hex 32` |
| `AUTH_EMAIL_VERIFICATION` | `on` | `off` = skip verification entirely (self-host escape hatch). In dev, links are console-logged and visible in Mailpit. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth auto-enables only when both are set. |

### AI providers

| Var | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `mock` | `mock` \| `openrouter` \| `openai` \| `anthropic` \| `google` \| `openai-compatible` |
| `AI_MODEL` | `mock-model` | Fallback model for all tasks. |
| `AI_API_KEY` | — | Required for every non-mock provider. |
| `AI_BASE_URL` | — | For `openai-compatible` (e.g. Ollama: `http://localhost:11434/v1`). |
| `AI_MODEL_SKELETON` | → `AI_MODEL` | Map structure generation (use a strong model). |
| `AI_MODEL_SECTION` | → `AI_MODEL` | Lesson content. |
| `AI_MODEL_CHAT` | → `AI_MODEL` | Companion bot (fast/cheap works well). |
| `AI_MODEL_ENRICH` | → `AI_MODEL` | Source enrichment (cheapest). |
| `EMBEDDINGS_MODEL` | `mock-embeddings` | |
| `EMBEDDINGS_DIMENSIONS` | `768` | Stored with vectors; switching dimensions triggers a re-embed job. |

**Common error — provider key missing:** `AI_PROVIDER=openrouter but AI_API_KEY is not set`. Fix: set the key or return to `AI_PROVIDER=mock`.

**Common error — embedding dimension mismatch:** stored vectors don't match `EMBEDDINGS_DIMENSIONS`. Cause: provider switch. Fix: run the re-embed job (M2) or restore the previous dimension.

### Optional

| Var | Notes |
|---|---|
| `YOUTUBE_API_KEY` | Enables live YouTube enrichment; without it, enrichment uses cache/mock. Bring your own key when self-hosting. |

## Production notes

- Deploy order: **migrate → ai → web**. The AI service hard-fails on schema mismatch at boot.
- Hosted reference stack: Vercel (web) + Neon (postgres) + Railway (ai).
- Checkpoint polling (not LISTEN/NOTIFY) is the default realtime transport, so pooled/serverless Postgres works out of the box.
