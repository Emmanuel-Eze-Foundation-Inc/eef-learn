# EEF Learn

Open-source community learning platform by the Emmanuel Eze Foundation (emmanuelezefoundation.org). A place anyone can go to learn (AI-built learning maps), connect (mentor coffee-chat matching), broadcast a need for help and get matched with helpers, and find physical/virtual events and training series.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel (web, `apps/web/vercel.json`) + Google Cloud Run (AI service `eef-ai`, `docker/ai.Dockerfile`) + Neon Postgres. Runbook: `docs/deploy.md`
- Production URL: `https://learn.emmanuelezefoundation.org`
- Deploy workflow: Vercel deploys staging on merge to `dev` and production on merge of `dev` into `main`; a person deploys the AI service with `gcloud run deploy` (see runbook)
- Deploy status command: HTTP health check
- Merge method: squash
- Project type: web app
- Post-deploy health check: `https://learn.emmanuelezefoundation.org/api/health` (`ok`, `db` and `ai` all true)

### Custom deploy hooks
- Pre-merge: `pnpm verify`
- Deploy trigger: Vercel GitHub integration (web); manual `gcloud run deploy` (AI service)
- Deploy status: poll production URL
- Health check: `https://learn.emmanuelezefoundation.org/api/health`

Read `AGENTS.md` first: it is the project guide for every agent (Claude Code, Cursor, Codex).
