#!/usr/bin/env node
/**
 * pnpm dev:setup — one-shot contributor bootstrap.
 * Target: hello-world in <=8 minutes with zero API keys.
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

console.log("EEF Learn dev setup\n===================");

// 1. env file
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("created .env from .env.example (mock AI provider, zero keys)");
} else {
  console.log(".env already exists, leaving it alone");
}

// 2. deps
run("pnpm install");

// 3. database (docker)
try {
  run("docker compose up -d postgres mailpit");
} catch {
  console.error(
    "\nproblem: could not start postgres via docker compose\n" +
      "  cause: docker is not running or not installed\n" +
      "  fix:   start Docker Desktop (or provide your own Postgres and set DATABASE_URL)\n" +
      "  docs:  docs/self-hosting.md#database",
  );
  process.exit(1);
}

// 4. wait for pg, migrate, seed
run("docker compose exec -T postgres sh -c 'until pg_isready -U eef -d eef_learn; do sleep 1; done'");
run("pnpm --filter @eef/db generate");
run("pnpm --filter @eef/db migrate:dev -- --name init --skip-seed || pnpm --filter @eef/db migrate:dev");
run("pnpm --filter @eef/db seed");

console.log(`
Done. Next:
  pnpm dev          # web on :3000, run AI service separately:
  cd apps/ai && uv run uvicorn eef_ai.main:app --reload

Demo moment: open http://localhost:3000/map/linear-algebra-demo
Mail UI (verification links): http://localhost:8025
`);
