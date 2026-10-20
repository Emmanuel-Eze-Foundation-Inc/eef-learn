# Launch checklist

The playbook's definition of done (`/eze-playbook` → definition of done), applied to EEF Learn's first public release at `https://learn.emmanuelezefoundation.org`. Status as of 20 Oct 2026. How to deploy and run it: [deploy.md](deploy.md).

## Decided

- **Hosting:** web app on Vercel, AI service and job worker on Google Cloud Run, Postgres on Neon. The agent-server rebuild in `docs/adr/0001-agent-server-grpc-mcp.md` comes after launch.
- **Domain:** `learn.emmanuelezefoundation.org`.
- **Email:** Resend over SMTP. `emmanuelezefoundation.org` is verified for sending (DKIM and the `send` / `rsend` records verified on 20 Oct 2026). DMARC on the domain is `p=quarantine`.
- **Google sign-in:** required on local, staging, and production. One web OAuth client; the app already shows the button when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- **Errors and uptime:** Sentry. No analytics at launch.
- **Landing the work:** the uncommitted changes go to `dev` as reviewed pull requests, one per feature.

## Ready

- [x] `pnpm verify` (lint, type check, core tests, AI service lint and tests, production build) runs before every push via `.githooks/pre-push` and on every pull request in `.github/workflows/ci.yml`.
- [x] Gitleaks secret scan on every pull request (`.gitleaks.toml`); history and working tree clean.
- [x] No known vulnerability in the web app, AI service or shared packages (`pnpm audit --prod`). The eight left are in the unreleased Expo scaffold (`apps/mobile`).
- [x] Creators' model keys encrypted at rest; keys in queued jobs sealed and dropped when the job ends.
- [x] Sign-up age gate (13+), email verification, sign-in rate limit, account deletion, session management.
- [x] Forgot and reset password (`/forgot-password`, `/reset-password`): one-hour links, every session signed out on reset.
- [x] Terms of use and privacy policy, linked from sign-up and the footer, published at `/terms` and `/privacy` (`LEGAL_DRAFT` is false).
- [x] Error pages (`not-found`, `error`, `global-error`) with Owlbert.
- [x] Sentry in the web app and AI service, off until a DSN is set; request bodies, cookies and personal data are not sent.
- [x] Security headers: content security policy, frame-ancestors none, referrer policy, permissions policy; HSTS once `AUTH_URL` is https.
- [x] `robots.txt`, `sitemap.xml` (foundation pages and public maps) and share cards for maps; private maps are not indexed.
- [x] Health check at `/api/health` covers the database and the AI service.
- [x] Deploy config: `apps/web/vercel.json` (migrations in the build), the AI image listens on Cloud Run's `PORT`, runbook in `deploy.md`.
- [x] Without `SMTP_URL` in production, email is not sent and links are never written to the log.

## Blocking launch (needs a person)

- [ ] **Accounts and secrets:** Resend is live. Vercel project `eef-learn` is linked to `Emmanuel-Eze-Foundation-Inc/eef-learn` (root `apps/web`, Next.js, region `iad1`, production branch `main`). Production is https://eef-learn.vercel.app and staging is https://eef-learn-git-dev-realemmanuelezes-projects.vercel.app. Both `/api/health` checks return `ok`, `db`, and `ai`. `main` was fast-forwarded to `dev` (`11a9d5e`) for that first production deploy. Production `AUTH_URL` is the `vercel.app` origin until the custom domain is attached. Neon project `eef-learn` (`restless-dream-77820732`, `aws-us-east-1`, Postgres 17) has branches `main` and `staging`, both migrated. Pooled and direct URLs are on Vercel Production and Preview. Local `.env` still points at Postgres on localhost. The free plan keeps 6 hours of restore history. Cloud Run is live in Google Cloud project `eze-cns`, region `us-east4`: production `eef-ai` (`https://eef-ai-211798114925.us-east4.run.app`) and staging `eef-ai-staging` (`https://eef-ai-staging-211798114925.us-east4.run.app`). Both `/health` checks return ok. Each service uses that environment's direct database URL and matching `AI_SERVICE_TOKEN` from Secret Manager, and Vercel Production and Preview `AI_SERVICE_URL` point at them. Billing account `My Billing Account 1` is linked to `eze-cns`. Sentry has no DSN, so `SENTRY_DSN` is not set. Production and Preview have their own `AUTH_SECRET` and `AI_SERVICE_TOKEN`, plus `SMTP_URL` and `EMAIL_FROM` (`EEF Learn <learn@emmanuelezefoundation.org>`).
- [x] **Resend DNS:** SPF (`send`, `rsend`), DKIM, and DMARC are in place. The app sends through `SMTP_URL` (`smtps://resend:<API key>@smtp.resend.com:465`). A `RESEND_API_KEY` alone does not send mail.
- [ ] **Google sign-in is created, not public yet.** Web client `EEF Learn` in Google Cloud project `eze-cns`. Redirects are saved for `localhost:3000`, `localhost:3001`, `localhost:3742`, `https://eef-learn.vercel.app`, `https://eef-learn-git-dev-realemmanuelezes-projects.vercel.app`, and `https://learn.emmanuelezefoundation.org`. The app is in Testing, so only the listed test users can sign in. Publishing waits on the Branding page (home, privacy, and terms links). The consent screen name is still `EZE-CNS`, shared with the existing desktop client.
- [ ] **App DNS:** `learn` CNAME to Vercel, after the first production deploy. `learn.emmanuelezefoundation.org` has no record yet.
- [ ] **Alerts reach a named person** (Sentry issue alerts and the uptime monitor).
- [ ] **One tested restore** from Neon, recorded in `deploy.md`.
- [ ] **Compliance profile** (`docs/compliance.md`, `/eze-compliance-profile`). Learners are 13+, so COPPA's under-13 rules do not apply, but teen accounts and US state privacy laws still need a decision.
- [ ] **Counsel still owes three points** that are no longer shown on the published pages: how long database backups keep deleted data, any extra notice for learners under 18, and the limitation-of-liability wording plus governing law.
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
