# syntax=docker/dockerfile:1
# One Heroku `web` dyno: Next.js on $PORT, FastAPI on loopback :8000.

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS ai
WORKDIR /ai
COPY apps/ai/pyproject.toml apps/ai/uv.lock ./
RUN uv sync --no-dev --frozen --no-install-project
COPY apps/ai ./
RUN uv sync --no-dev --frozen

FROM node:22-slim AS web
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ui-tokens/package.json packages/ui-tokens/package.json
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages packages
COPY apps/web apps/web
RUN pnpm --filter @eef/db generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://eef:eef@postgres:5432/eef_learn
ENV AI_SERVICE_TOKEN=build-time-placeholder
ENV AI_SERVICE_URL=http://127.0.0.1:8000
ENV AUTH_SECRET=build-time-placeholder-min16
ENV AUTH_URL=http://localhost:3000
ENV AI_PROVIDER=mock
RUN pnpm --filter web build

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=web /usr/local/bin/node /usr/local/bin/node
COPY --from=web /usr/local/bin/corepack /usr/local/bin/corepack
COPY --from=web /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
COPY --from=web /repo /repo
COPY --from=ai /ai /ai
COPY scripts/heroku-db-url.sh scripts/heroku-release.sh scripts/heroku-web.sh /repo/scripts/
RUN chmod +x /repo/scripts/heroku-db-url.sh /repo/scripts/heroku-release.sh /repo/scripts/heroku-web.sh
WORKDIR /repo
ENV NODE_ENV=production
ENV AI_SERVICE_URL=http://127.0.0.1:8000
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["/repo/scripts/heroku-web.sh"]
