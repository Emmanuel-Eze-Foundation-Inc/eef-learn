# Deploy and run EEF Learn

The runbook for the hosted service at `https://learn.emmanuelezefoundation.org`: how it is laid out, how to set it up, deploy, roll back and restore, and who is told when it breaks. Self-hosting with Docker is separate: [self-hosting.md](self-hosting.md).

Agents prepare changes; a person runs the one-time setup and approves every production deploy (playbook rule 9).

## Layout

| Part | Runs on | Region | Notes |
| --- | --- | --- | --- |
| Web app (`apps/web`) | Vercel | `iad1` (Washington, DC) | Pages, API routes, auth, MCP at `/api/mcp`. Migrations run in its build. |
| AI service and job worker (`apps/ai`) | Google Cloud Run, service `eef-ai` | `us-east4` (N. Virginia) | Tutor, course agent and the `GenerationJob` worker. Always on: the worker polls the queue. |
| Database | Neon Postgres with pgvector | `aws-us-east-1` | Branch `main` is production, branch `staging` is staging and previews. |
| Email | Resend over SMTP | | Verification, password reset, email change. Sender on `emmanuelezefoundation.org`. |
| Errors and uptime | Sentry | US | Projects `eef-learn-web` and `eef-learn-ai`; an uptime monitor on `/api/health`. |

| Environment | Git branch | Web | Database branch |
| --- | --- | --- | --- |
| Production | `main` (merges from `dev` only) | `learn.emmanuelezefoundation.org` | `main` |
| Staging | `dev` | Vercel preview URL for `dev` | `staging` |
| Pull request previews | any | Vercel preview URL | `staging` |

## One-time setup (by a person)

1. **Neon.** Create the project in `aws-us-east-1`, then a `staging` branch. For each branch copy two URLs: the pooled one (host contains `-pooler`, add `?pgbouncer=true&connection_limit=1`) for the web app at runtime, and the direct one for migrations and the AI service (asyncpg does not work through the pooler). The first migration creates the `vector` extension.
2. **Secrets.** Generate `AUTH_SECRET` and `AI_SERVICE_TOKEN` with `openssl rand -hex 32`, one pair per environment. Never reuse the dev values.
3. **Cloud Run.** Create an Artifact Registry repository `eef` in `us-east4` and put each environment's `DATABASE_URL` (direct), `AI_SERVICE_TOKEN` and `SENTRY_DSN` in Secret Manager. Then deploy as below. Copy the service URL.
4. **Resend.** Add `emmanuelezefoundation.org` (or a `mail.` subdomain), add its SPF, DKIM and DMARC records at the foundation's DNS, and create an API key with sending access only. `SMTP_URL=smtps://resend:<API key>@smtp.resend.com:465`, `EMAIL_FROM=EEF Learn <learn@emmanuelezefoundation.org>`.
5. **Sentry.** Create `eef-learn-web` (Next.js) and `eef-learn-ai` (Python, FastAPI). Alert rules: every new issue, and any issue over 10 events in an hour, to the on-call person below. Add an uptime monitor on `https://learn.emmanuelezefoundation.org/api/health` every minute.
6. **Vercel.** Import the GitHub repo with root directory `apps/web` (`apps/web/vercel.json` sets install and build), function region `iad1`. Set the variables below for Production and for Preview. Add the domain `learn.emmanuelezefoundation.org` (a `CNAME` to `cname.vercel-dns.com` at the foundation's DNS).
7. **Google sign-in** (optional). Authorised redirect URI `https://learn.emmanuelezefoundation.org/api/auth/callback/google`.
8. **GitHub.** Protect `main` and `dev`: require the `pnpm verify` and `Secret scan` checks and one review, with code-owner review for tests.

## Environment variables

Web app (Vercel; Production and Preview get their own values):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_DATABASE_URL` | Neon direct URL (build-time migrations) |
| `AUTH_URL` | `https://learn.emmanuelezefoundation.org` (Preview: the stable `dev` branch URL, `https://<project>-git-dev-<team>.vercel.app`; sign-in on other preview URLs needs them in `AUTH_TRUSTED_ORIGINS`) |
| `AUTH_SECRET`, `AI_SERVICE_TOKEN` | From step 2 |
| `AI_SERVICE_URL` | Cloud Run service URL |
| `AI_PROVIDER`, `AI_MODEL` | `openrouter`, `openai/gpt-4o-mini` (the default model for creators who pick none; never `mock` in production) |
| `AUTH_EMAIL_VERIFICATION` | `on` |
| `SMTP_URL`, `EMAIL_FROM` | From step 4 |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `eef-learn-web` DSN; `production` or `staging` |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | For source maps (the token is a secret) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional |
| `YOUTUBE_API_KEY` | Real video lengths when blocks are saved |

AI service (Cloud Run): `DATABASE_URL` (direct), `AI_SERVICE_TOKEN`, `AI_PROVIDER` and `AI_MODEL` (same as web), `YOUTUBE_API_KEY`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`.

## Deploy

- **Web.** Merging to `dev` deploys staging; merging `dev` into `main` deploys production. The build runs `prisma migrate deploy` against that environment's database first, so a failed migration stops the deploy before any traffic moves.
- **AI service.** It refuses to start on a database schema it does not match, so deploy it after the web build that carries the migrations has finished. If a release needs the new AI service before the new web app, run the migrations yourself first (`DATABASE_URL=<direct URL> pnpm --filter @eef/db migrate:deploy`), deploy the AI service, then merge.

```bash
TAG=$(git rev-parse --short HEAD)
IMAGE=us-east4-docker.pkg.dev/<gcp-project>/eef/ai:$TAG
docker build --platform linux/amd64 -f docker/ai.Dockerfile -t "$IMAGE" apps/ai && docker push "$IMAGE"
gcloud run deploy eef-ai --image "$IMAGE" --region us-east4 \
  --min-instances 1 --max-instances 3 --no-cpu-throttling --timeout 300 --allow-unauthenticated \
  --set-env-vars AI_PROVIDER=openrouter,AI_MODEL=openai/gpt-4o-mini,SENTRY_ENVIRONMENT=production \
  --set-secrets DATABASE_URL=eef-db-direct:latest,AI_SERVICE_TOKEN=eef-ai-token:latest,SENTRY_DSN=eef-ai-sentry:latest
```

`--allow-unauthenticated` lets Vercel reach it; every route except `/health` still demands the `AI_SERVICE_TOKEN` bearer. More than one instance is safe: jobs are claimed with `FOR UPDATE SKIP LOCKED`.

- **Check.** `https://learn.emmanuelezefoundation.org/api/health` returns `{"ok":true,"db":true,"ai":true}`; sign in; open a course; ask Owlbert a question with a key set.

## Roll back

- **Web.** In Vercel, Deployments → the last good one → Instant Rollback. Then revert the merge on `main`.
- **AI service.** `gcloud run services update-traffic eef-ai --region us-east4 --to-revisions <previous revision>=100`.
- **Database.** Migrations only move forward. Write them expand-then-contract (add the new column, ship code that uses both, remove the old one later) so the previous web and AI versions keep working after a migration. If a migration damaged data, restore (below).

## Restore

Neon keeps history for point-in-time restore. To restore: create a branch from `main` at a time before the problem, check it (`psql`, counts of `User`, `Map`, `Progress`), then point `DATABASE_URL` and `DIRECT_DATABASE_URL` (Vercel) and the `eef-db-direct` secret (Cloud Run) at it and redeploy both. Test this on `staging` once a quarter and record the date here.

| Restore tested | By | Result |
| --- | --- | --- |
| To confirm | | |

## Rotating a secret

- `AI_SERVICE_TOKEN`: the AI service accepts both `AI_SERVICE_TOKEN` and `AI_SERVICE_TOKEN_NEXT`. Set the new value as `_NEXT` on Cloud Run, then as `AI_SERVICE_TOKEN` on Vercel and redeploy, then on Cloud Run swap them (new in `AI_SERVICE_TOKEN`, old in `_NEXT`). Clear `_NEXT` once no job is queued; until then, jobs sealed with the old token still open.
- `AUTH_SECRET`: changing it signs everyone out, makes saved model keys unreadable (creators re-enter them), and breaks every page until the stored signing keys are cleared (`DELETE FROM "Jwks";`, then reconnect AI apps over MCP). Only rotate after a leak.

## Who is told

| What | Who | How |
| --- | --- | --- |
| Errors and uptime (Sentry) | To confirm | Email and phone push |
| Hosting bills and limits (Vercel, Cloud Run, Neon, Resend) | To confirm | Email |
| Security reports | admin@emmanuelezefoundation.org | Email |
