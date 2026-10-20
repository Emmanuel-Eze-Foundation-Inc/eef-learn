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
| `AI_SERVICE_TOKEN` | Shared bearer secret, identical in web and ai. It also seals the creator's model key inside queued jobs, so a database dump never holds a usable key; the worker drops it when the job ends. |
| `AI_SERVICE_TOKEN_NEXT` | Optional second token accepted during rotation: set NEXT everywhere, flip primary, clear NEXT. |
| `AI_SERVICE_URL` | Where web reaches the AI service (`http://ai:8000` inside compose). |

### Auth

| Var | Default | Notes |
|---|---|---|
| `AUTH_SECRET` | — | `openssl rand -hex 32` |
| `AUTH_URL` | `http://localhost:3000` | Public origin of the web app. Auth callbacks, cookies, and email links use this. Must be the exact `https://` URL users type in production. |
| `AUTH_TRUSTED_ORIGINS` | — | Optional comma-separated extra origins (preview URLs). `AUTH_URL` is always trusted. |
| `AUTH_EMAIL_VERIFICATION` | `on` | `off` = skip verification entirely (self-host escape hatch). In dev, links are console-logged and visible in Mailpit. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth auto-enables only when both are set. |

### AI providers

| Var | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `mock` | `mock` gives keyless users deterministic output. Any other value means real models only: keyless users are asked to connect their own AI. |
| `AI_MODEL` | `mock-model` | Fallback OpenRouter model for creators on OpenRouter who chose none. |
| `AI_MODEL_SKELETON` | → `AI_MODEL` | Map structure generation (use a strong model). |
| `AI_MODEL_SECTION` | → `AI_MODEL` | Lesson content. |
| `AI_MODEL_CHAT` | → `AI_MODEL` | Companion bot (fast/cheap works well). |
| `AI_MODEL_ENRICH` | → `AI_MODEL` | Source enrichment (cheapest). |
| `EMBEDDINGS_MODEL` | `mock-embeddings` | |
| `EMBEDDINGS_DIMENSIONS` | `768` | Stored with vectors; switching dimensions triggers a re-embed job. |

The platform holds no model key and sets no usage limits. Each creator adds their own key in **Settings → Your AI** (OpenRouter, OpenAI, Anthropic or Google Gemini, with an optional model id), stored encrypted with `AUTH_SECRET`. Without one, AI routes answer `409` with code `model_required`.

**MCP.** Creators can also connect their own assistant (Claude, ChatGPT, Cursor, Claude Code, Gemini CLI) to `{AUTH_URL}/api/mcp`, which lets it list, read, create, edit and publish their maps on their own plan. Better Auth acts as the OAuth 2.1 server, with Client ID Metadata Documents plus dynamic registration for older clients. The consent screen is `/connect/consent`, and discovery is served under `/.well-known/*` (rewritten to `/api/well-known/*`). MCP needs an `https` `AUTH_URL`; on plain `http` it stays off, except on `localhost`. Settings → Your AI shows each client's setup steps and lets creators disconnect apps.

**Common error — embedding dimension mismatch:** stored vectors don't match `EMBEDDINGS_DIMENSIONS`. Cause: provider switch. Fix: run the re-embed job (M2) or restore the previous dimension.

### Optional

| Var | Notes |
|---|---|
| `YOUTUBE_API_KEY` | Enables live YouTube enrichment; without it, enrichment uses cache/mock. Bring your own key when self-hosting. |

## Production notes

- Deploy order: **migrate → ai → web**. The AI service hard-fails on schema mismatch at boot.
- Hosted flagship (`learn.emmanuelezefoundation.org`): Vercel, Google Cloud Run and Neon. See [deploy.md](deploy.md).
- Checkpoint polling (not LISTEN/NOTIFY) is the default realtime transport, so pooled/serverless Postgres works out of the box.
- Health: web `GET /api/health` (database and AI service; 503 if either is down); AI `GET /health`.

### Heroku (single container)

A simple way to self-host on one paid dyno. Heroku only routes HTTP to the `web` process, so web and AI share one image (`docker/heroku.Dockerfile`): Next.js binds `$PORT` and the AI service listens on `127.0.0.1:8000` in the same container. `heroku.yml` builds that image, runs `pnpm --filter @eef/db migrate:deploy` in the release phase, then starts both processes.

```bash
heroku login
heroku container:login
heroku create
heroku stack:set container
heroku addons:create heroku-postgresql
heroku config:set \
  AUTH_SECRET="$(openssl rand -hex 32)" \
  AUTH_URL="https://<app-name>.herokuapp.com" \
  AI_SERVICE_TOKEN="$(openssl rand -hex 32)" \
  AUTH_EMAIL_VERIFICATION=on \
  AI_PROVIDER=mock
git push heroku HEAD:main
```

Then set `AUTH_URL` to the exact https origin users will open (custom domain if you attach one). Add `SMTP_URL` and `EMAIL_FROM` before public signup. Creators bring their own model key or connect their AI over MCP; do not ship `AI_PROVIDER=mock` on a public site. If migrate fails on `CREATE EXTENSION vector`, enable pgvector on the add-on (supported on current Heroku Postgres) and re-run the release.

GitHub default branch is `dev`. Point the Heroku GitHub integration at `dev`, or push `dev:main` to the `heroku` remote. `main` in this repo is publish-only.

Local image check: `docker build -f docker/heroku.Dockerfile .`

### Production checklist (Heroku)

Do not copy the mock/dev defaults into production.

1. **Secrets.** `AUTH_SECRET` from `openssl rand -hex 32`. A new `AI_SERVICE_TOKEN` shared by Next and the in-container AI process. Never reuse `dev-local-token` or `dev-only-secret-change-me-0123456789`.
2. **Public URL.** `AUTH_URL=https://<your-domain>` exactly as users will open it. HTTPS turns on secure cookies. Add extra hosts to `AUTH_TRUSTED_ORIGINS` if you sign in on those URLs.
3. **Database.** Heroku `DATABASE_URL` (release script appends `sslmode=require` when missing) with the `vector` extension. Migrations run in the Heroku release phase.
4. **Email.** Keep `AUTH_EMAIL_VERIFICATION=on`. Set `SMTP_URL` and a real `EMAIL_FROM` on a domain you control. Unset SMTP logs links to the server console, which is useless for real signups.
5. **AI.** There is no platform key. Creators use their own key from Settings, or their own AI client over MCP. Set `AI_PROVIDER=openrouter` on the public site so keyless users are asked to connect their AI instead of getting mock maps.
6. **AI service.** Same dyno, loopback. Do not set `AI_SERVICE_URL` to a public URL unless you split services later.
7. **Google OAuth (optional).** Set both Google vars, then add `{AUTH_URL}/api/auth/callback/google` as an authorized redirect URI.
8. **Compose production image.** `docker compose` local still uses the `dev` target. A production web-only image is `docker build -f docker/web.Dockerfile --target prod`.
