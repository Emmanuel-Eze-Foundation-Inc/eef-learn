# Launch checklist

The playbook's definition of done (`/eze-playbook` → definition of done), applied to EEF Learn's first public release at `https://learn.emmanuelezefoundation.org`. Status as of 20 Oct 2026. How to deploy and run it: [deploy.md](deploy.md).

## Decided

- **Hosting:** web app on Vercel, AI service and job worker on Google Cloud Run, Postgres on Neon. The agent-server rebuild in `docs/adr/0001-agent-server-grpc-mcp.md` comes after launch.
- **Domain:** `learn.emmanuelezefoundation.org`.
- **Email:** Resend over SMTP.
- **Errors and uptime:** Sentry. No analytics at launch.
- **Landing the work:** the uncommitted changes go to `dev` as reviewed pull requests, one per feature.

## Ready

- [x] `pnpm verify` (lint, type check, core tests, AI service lint and tests, production build) runs before every push via `.githooks/pre-push` and on every pull request in `.github/workflows/ci.yml`.
- [x] Gitleaks secret scan on every pull request (`.gitleaks.toml`); history and working tree clean.
- [x] No known vulnerability in the web app, AI service or shared packages (`pnpm audit --prod`). The eight left are in the unreleased Expo scaffold (`apps/mobile`).
- [x] Creators' model keys encrypted at rest; keys in queued jobs sealed and dropped when the job ends.
- [x] Sign-up age gate (13+), email verification, sign-in rate limit, account deletion, session management.
- [x] Forgot and reset password (`/forgot-password`, `/reset-password`): one-hour links, every session signed out on reset.
- [x] Terms of use and a rewritten privacy policy, linked from sign-up and the footer. Both show a draft banner until counsel confirms (`LEGAL_DRAFT` in `app/components/legal-page.tsx`).
- [x] Error pages (`not-found`, `error`, `global-error`) with Owlbert.
- [x] Sentry in the web app and AI service, off until a DSN is set; request bodies, cookies and personal data are not sent.
- [x] Security headers: content security policy, frame-ancestors none, referrer policy, permissions policy; HSTS once `AUTH_URL` is https.
- [x] `robots.txt`, `sitemap.xml` (foundation pages and public maps) and share cards for maps; private maps are not indexed.
- [x] Health check at `/api/health` covers the database and the AI service.
- [x] Deploy config: `apps/web/vercel.json` (migrations in the build), the AI image listens on Cloud Run's `PORT`, runbook in `deploy.md`.
- [x] Without `SMTP_URL` in production, email is not sent and links are never written to the log.

## Blocking launch (needs a person)

- [ ] **Accounts and secrets:** Vercel, Neon, Google Cloud, Resend and Sentry set up as in [deploy.md](deploy.md), with production secrets.
- [ ] **DNS:** `learn` CNAME to Vercel; Resend's SPF, DKIM and DMARC records.
- [ ] **Alerts reach a named person** (Sentry issue alerts and the uptime monitor).
- [ ] **One tested restore** from Neon, recorded in `deploy.md`.
- [ ] **Compliance profile** (`docs/compliance.md`, `/eze-compliance-profile`). Learners are 13+, so COPPA's under-13 rules do not apply, but teen accounts and US state privacy laws still need a decision.
- [ ] **Counsel reviews** the terms and privacy policy and the "To confirm" notes in them; then set `LEGAL_DRAFT = false`.
- [ ] **Branch protection** on `main` and `dev`: `pnpm verify` and `Secret scan` required, one review, code owners for tests.
- [ ] **Uncommitted work landed** on `dev` through reviewed pull requests and checked on staging.

## Soon after launch

- [ ] Accessibility pass (WCAG 2.2 AA, axe plus keyboard and screen reader) and a speed check on the landing, community, player and studio.
- [ ] Feature flags for the course agent.
- [ ] Web app tests: the app has none of its own yet; start with access rules (`lib/map-access.ts`), the agent op validator (`lib/course-agent.ts`) and key sealing (`lib/user-ai-key.ts`).
- [ ] Dependabot or Renovate.
- [ ] Decide whether to keep the Heroku files (`heroku.yml`, `docker/heroku.Dockerfile`) as a self-host option or remove them.

## To confirm

- **Who gets alerts** and who is on call.
- **Backup retention** on the Neon plan (named in the privacy policy).
- **Email sender address** (`learn@` or a `mail.` subdomain).
