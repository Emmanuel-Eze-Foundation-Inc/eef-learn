FROM node:22-slim AS deps
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
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

FROM deps AS dev
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "dev"]
