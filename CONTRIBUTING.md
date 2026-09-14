# Contributing to EEF Learn

Thanks for helping build community-led learning maps. This project is MIT-licensed and maintained by the Emmanuel Eze Foundation.

## Quickstart (target: ≤8 minutes, zero API keys)

```bash
git clone https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn
cd eef-learn
pnpm dev:setup   # copies .env, installs deps, boots postgres, migrates, seeds
pnpm dev         # web on http://localhost:3000
# in another terminal:
cd apps/ai && uv sync && uv run uvicorn eef_ai.main:app --reload
```

The default AI provider is `mock` — deterministic canned output, no keys, no spend. The demo moment is the seeded map at `/map/linear-algebra-demo`.

## Repository layout

| Path | What |
|---|---|
| `apps/web` | Next.js App Router (Tailwind, shadcn/ui, react-three-fiber) |
| `apps/mobile` | Expo scaffold (v1.5 — no store release from v1) |
| `apps/ai` | Python FastAPI service: generation pipelines, RAG, jobs worker |
| `packages/db` | Prisma schema + client + seed |
| `packages/core` | Shared domain logic + the env contract (zod) |
| `packages/ui-tokens` | Aurora design tokens (source: `docs/design/BRAND.md`) |

## Rules of the road

- **Plan first:** `PLAN.md` is the reviewed implementation plan. PRs should map to a milestone item.
- **Env contract:** web and AI share the same `AI_*` variable names. Never add a provider var to one side only.
- **Error contract:** operator-facing failures state problem + cause + fix + docs link.
- **Attribution is sacred:** any content path that loses source credit is a bug, not a nice-to-have.
- **Both themes, both maps:** UI work must hold up in dark and light, and in the 2D map fallback.
- Lint/typecheck/test must pass: `pnpm lint && pnpm typecheck && pnpm test`, and `cd apps/ai && uv run pytest`.

## Commits & PRs

- Conventional-ish commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Small PRs beat big ones. Include screenshots for UI changes (both themes).

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Be the person you'd want at your coffee chat.
