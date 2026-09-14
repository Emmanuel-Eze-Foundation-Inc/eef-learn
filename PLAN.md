# EEF Learn — v1 Implementation Plan

Source design: `docs/designs/eef-learn-platform.md` (APPROVED 2026-09-13, office-hours + 3x adversarial review)

## Goal

Ship the v1 wedge: responsive web app where a user signs up, submits a topic (or PDF), gets an AI-generated learning map (knowledge graph) with credited sources, travels it in true 3D, scrolls into sections whose content generates in realtime, keeps persistent progress, and talks to a progress-aware RAG companion bot. Open source, self-hostable, hosted flagship on Vercel + Neon + Railway.

## Milestones

### M0 — Repo + monorepo scaffold
- Public GitHub repo under EEF, MIT license, README, CONTRIBUTING, CoC
- Turborepo + pnpm: `apps/web` (Next.js App Router, Tailwind + shadcn/ui), `apps/mobile` (Expo, NativeWind — scaffold only, no store release), `apps/ai` (FastAPI + uv), `packages/db` (Prisma schema + client), `packages/core` (shared domain types/logic), `packages/ui-tokens` (design tokens)
- docker-compose: postgres (pgvector), web, ai — runs migrate + seed on boot; TTHW target ≤8 min with zero API keys
- Mock AI provider (`AI_PROVIDER=mock`, default in `.env.example`): deterministic canned maps/content for hello-world and CI e2e without spend
- Boot-time env validation in both services (zod / pydantic-settings): missing/invalid vars error with problem + cause + fix + docs link
- `pnpm dev:setup` one-shot contributor bootstrap; fully commented `.env.example`
- Docs at creation: README (quickstart + named demo moment), CONTRIBUTING.md, docs/architecture.md (diagram + package map), docs/self-hosting.md (canonical env-var table), docs/upgrading.md (migration notes per release), LICENSE (MIT), CODE_OF_CONDUCT.md
- **Shared AI provider env contract across BOTH services:** `AI_PROVIDER` (mock/openrouter/openai/anthropic/google/openai-compatible), `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL` (enables Ollama/local models; OpenRouter = hosted default per gate T-2), per-task model map `AI_MODEL_SKELETON`/`AI_MODEL_SECTION`/`AI_MODEL_CHAT`/`AI_MODEL_ENRICH` (all fall back to `AI_MODEL`), `EMBEDDINGS_MODEL` + stored embedding dimensions with a re-embed job for provider switches — one config, no dual-setup trap
- Operator error contract (both services): problem + cause + fix + docs link for pgvector-extension missing, migration mismatch, AI service unreachable, invalid provider key, embedding dimension mismatch
- Clean-clone CI smoke: compose boot + demo-map seed verified on every PR (moved from M5 to M0)
- GitHub Actions: lint + typecheck + test on PR; deploy web (Vercel) and ai (Railway) on main
- CLAUDE.md routing rules (done), PLAN.md, design doc committed

### M1 — Auth + data layer
- Better Auth: email/password + Google OAuth (auto-enabled only when creds present — optional for self-hosters), 13+ birthdate gate, roles (user, admin), email verification + per-IP signup rate limiting (quota-farming defense)
- Local-dev mail story: console-logged verification links in dev + Mailpit in docker-compose; `AUTH_EMAIL_VERIFICATION=off` escape hatch for self-hosters
- Prisma schema: User(+role), Map(version, visibility, sourcePolicy, generation settings), Node(stable slug), Edge, ContentBlock(typed: youtube/blog/ai_text/pdf_extract + attribution/provenance fields), Attribution, MapComposition + UpdateProposal (schema only), Progress(updatedAt optimistic guard), CompanionThread + Message, GenerationJob(status, checkpoints, lease: claimed_by/heartbeat_at/attempts/max_attempts), Quota, KbPage
- GenerationJob dedup: partial unique index on `(map_id, node_id, block_index) WHERE status IN ('queued','running')` — second tab/double-click attaches to the existing job's checkpoints instead of double-spending (eng E1)
- Admin settings: per-user/per-map generation enable/disable; quota defaults (3 maps, 30 sections, 100 bot msgs/day)

### M2 — Generation pipeline (AI service)
- FastAPI service: bearer-token auth (dual-token rotation overlap documented), jobs worker loop over GenerationJob
- Job lifecycle spec: claim via `SELECT ... FOR UPDATE SKIP LOCKED`, heartbeat column + reaper returns stale `running` → `queued`, attempts/max_attempts with exponential backoff, idempotent checkpoint writes (crash-resume never duplicates blocks) (eng A2)
- Quota/spend atomicity: quotas enforced via atomic conditional decrement (`UPDATE ... WHERE used < limit RETURNING`); spend cap reserves estimated cost at enqueue, reconciles actual at completion; failed generations refund quota; daily reset at UTC midnight (eng E2)
- Skeleton-first map generation: topic → graph skeleton (nodes/edges, stable slugs) streamed via Postgres checkpoints; all LLM structural output schema-validated with ONE bounded repair-reprompt; minimum-viable-graph rules (node-count bounds, DAG check on prerequisite edges) (eng E5)
- Section content generation on demand: ai_text blocks (provenance: model id, prompt hash, source block ids), token ceilings
- YouTube enrichment as separate low-priority job: cached search (Postgres cache keyed by normalized query), Data API, credit fields
- Source URL validation: every AI-proposed YouTube/blog URL verified via oEmbed/HEAD before persisting (hallucinated-source defense) — **SSRF-hardened**: scheme+domain allowlist, resolve + block private/link-local/metadata IP ranges, no redirect-following into internal ranges, timeouts (eng S1); retrieved/user content fenced as data in prompts (injection defense)
- Blog links: link + oEmbed/OpenGraph metadata only
- PDF import: parse (pymupdf) with 20MB/MIME+magic-byte/page-cap limits, parse timeout, in worker not request thread; empty-extraction (scanned/image PDF) detected explicitly; chunk + embed; stick-to-doc vs augment modes
- Embeddings ingestion for RAG (pgvector), KB ingestion from docs/kb/ + admin KB pages; **every vector/FTS query filtered by ownership/visibility** (no cross-tenant retrieval leaks) (eng S2)
- Single `/retrieve` endpoint on AI service owns query-embedding + hybrid search + RRF — TS side never embeds (kills the dual-provider-config trap) (eng A4)
- Generation-side failure registry mirroring the UX one: malformed LLM JSON, degenerate graph, empty PDF text, all-sources-failed-validation (defined degraded state: ai_text-only section), embedding dimension mismatch
- Degraded modes per design doc (quota exhausted, provider error → backoff + circuit-break to queued, parse failure, spend cap)
- Deploy order documented: migrate → deploy ai → deploy web; AI service boots with schema-compatibility check (hard fail on migration mismatch) (eng A3)

### M3 — 3D map experience (web)
- SPIKE FIRST (pass/fail per design doc): 200 nodes @ 30fps mid-tier Android browser + scroll-driven camera flight synced with DOM content column at 30fps. Global failure → escalate to user (D4 reversal), prepared fallback 2D-primary.
- react-three-fiber force-directed 3D constellation, mastery states, camera travel into nodes
- Section view: pinned mini-map + scrollable content column, realtime generation progress via **checkpoint polling as the primary transport** (client polls a checkpoint endpoint with last-seen-id resume tokens — survives serverless timeouts and Neon pooling; LISTEN/NOTIFY is a self-host-only optimization, signal-only payloads, checkpoints re-read on every reconnect) (eng A1 — LISTEN/NOTIFY + long SSE is incompatible with Vercel+Neon: pooled connections can't LISTEN, direct-connection caps are low, functions can't hold long streams)
- All checkpoint reads and progress writes carry `map_version`; stale-version writes rejected with typed error → "this map was updated — reload" banner (creator regenerated under an active learner) (eng E4)
- 2D fallback map (auto below performance budget)
- Creator-only per-section regenerate control (respects admin enablement)
- Progress checkpoints saved per block completion
- Read-only publish/share link (map visibility flag + public route + OG card) — v1 community hook
- Dashboard hierarchy: resume card → my-maps grid → new-map CTA
- Anonymous skeleton-only topic preview before signup; auth required to generate full content + save. Cost defenses (eng E3): platform-provided client IP only, per-IP limit **plus** an independent global anonymous-preview daily budget (hard-stops the feature without touching authed spend), skeleton previews cached by normalized topic, Turnstile challenge wired-but-dormant if abuse appears
- Full state coverage per screen: loading/empty/error/success/partial (incl. 3D canvas init skeleton, progressive node appearance, bot thinking)
- Accessibility: prefers-reduced-motion disables camera flight; 2D map always reachable as keyboard/screen-reader view; ARIA landmarks on blocks; WCAG AA tokens; 44px touch targets
- Responsive: single-column section view on mobile, mini-map as bottom-sheet toggle, touch orbit controls (drag orbits, pinch zooms, page never scrolls while canvas focused)
- **Scroll-mode state machine (pre-M3 spec):** map mode (scroll = dolly/zoom) vs section mode (scroll = content column ONLY); camera flight to next node requires explicit "continue" action at section end — never overscroll; Escape/back always returns to map; every node gets a URL (`/map/:slug/:nodeSlug`) so back/forward + deep links work
- Generation triggers are explicit: first block auto-generates on section entry; subsequent blocks via "continue ↓" affordance with remaining-quota shown subtly (no implicit quota burn from idle scrolling)
- **2D fallback parity constraint:** section view, scroll rules, progress, and generation UX are identical in both modes — only the map canvas differs (3D constellation vs 2D pan/zoom graph)
- 3D interaction spec: billboarded distance-faded labels (focused node always legible), constrained orbit + reset-view control, hover glow click affordance, progressive node-reveal during skeleton streaming (camera pulls back as graph grows)
- Mastery states encoded by shape/icon + color (colorblind-safe), not color alone
- Interim one-page visual spec before M3 (dark constellation palette, 2-3 named mastery colors, node/edge treatment, one type scale, motion durations) — brand guide still deferred
- Public share page spec: read-only map (3D if budget allows), already-generated content only, "start your own map" CTA, OG card = map title + node count + EEF attribution
- Quota messaging aspirational ("You've created 3 maps today — dive into one; more tomorrow"); bot greets returning users progress-aware ("you were halfway through X")

### M4 — Companion bot
- Vercel AI SDK chat (streaming), hybrid RAG over map content + user progress + org KB — retrieval exclusively via the AI service `/retrieve` endpoint (visibility-scoped)
- Fixed tool list: mark section complete, jump to node, explain differently, regenerate section (creator only, if enabled), cite sources — **every tool re-verifies authz server-side against the session, never trusts LLM context** (eng S3)
- Progress awareness (current node/section in context), minor-safe system prompt variant for under-18
- Per-user daily message quota; retrieval-only degraded mode at spend cap
- **Coffee-chat request button (gate UC-2):** on map completion, "request a 30-min coffee chat" form (topic auto-filled, availability, note) → stored + emailed to EEF admin who manually matches from alumni pool; no matching engine in v1

### M5 — Hosted launch readiness + pilot cohort
- Vercel (web) + Neon (pg) + Railway (ai) deploys wired; env/secret docs
- Observability minimum: generation latency p90, failure rate, AI spend/day
- Seed script + `docker compose up` self-host path verified clean-clone
- Instrument success criterion: p90 < 60s topic → first rendered section block
- **Pilot cohort: 10–30 adults recruited from EEF's alumni/family orbit (the foundation's proprietary cold-start asset); launch success = ≥10 real learners complete ≥1 section, not just latency metrics**

## Validation (runs BEFORE M2, in parallel with M0/M1)
- 5+ interviews with adults who tried to self-learn and stalled in the last 6 months (what did they do when stuck; would they take a 30-min coffee chat with someone who finished the same map). Findings feed M2 content strategy and the v1.5/v2 sequencing decision.
- Stakeholder mapping page: who funds EEF, what they believe they fund, how "EEF Learn for adults" is positioned to them (pre-public-launch dependency).

## Explicitly NOT in v1 (deferred)
- v1.5: Expo store releases (EAS), expo-gl 3D on native
- v2: publish/discover community maps, map composition UI + update proposals, Mentor Match (swipe, coffee chats), help broadcasts, events, moderation tooling
- Brand guide execution (design-consultation deliverable; placeholder wordmark in v1)

## Risks
- 3D spike failure (mitigation: staged pass/fail + prepared 2D fallback, user gate)
- YouTube quota (mitigations designed: cache, async enrichment, quota application, BYO key)
- AI cost on nonprofit budget (quotas + spend cap + token ceilings)
- Solo maintainer bus factor (mitigation: boring stack, CONTRIBUTING.md, CI)
- Frontier labs (OpenAI/Google study modes, Khanmigo/LearnLM) commoditize personal map generation from above (mitigation: position on what's lab-proof — community graph, attribution lineage, EEF's human network; never compete on generation quality)

<!-- /autoplan restore point: ~/.gstack/projects/Learn/main-autoplan-restore-20260913-193818.md -->

---

# GSTACK REVIEW REPORT (/autoplan, 2026-09-13)

Mode: SELECTIVE EXPANSION · Voices: [subagent-only] (Codex CLI not installed) · UI scope: YES · DX scope: YES

## Phase 1 — CEO Review

### 0A Premise assessment
- **P1 (pivot to anyone):** stated and user-confirmed. Risk noted, not blocking: existing donor/brand expectations are kids-focused; the "by EEF" sub-brand (D15) contains this. ACCEPTED.
- **P2 (learning-map wedge first):** stated. Strategic soft spot: v1 alone is a personal generator in a commoditized category (5+ OSS equivalents found in research); differentiation (community composition + humans) lands in v2. Mitigated by schema-first composition design and by pulling a **read-only publish/share link into v1** (see scope decisions). ACCEPTED WITH RISK NOTE.
- **P3 (true 3D in v1, amended with fallback + v1.5 store release):** user taste call, already amended post-review with performance budget, spike gate, and escalation path. The v1.5 mobile demotion is queued as **User Challenge UC-1** for the final gate. ACCEPTED (queued).
- **Implicit premise — nonprofit can fund hosted AI:** made explicit by quotas/spend caps/cost estimates in the design doc. ACCEPTED.
- **Implicit premise — open source attracts contributors:** unproven; cost of being wrong is low (repo still serves transparency/self-hosting). ACCEPTED.

### 0B Existing leverage map (greenfield → reuse ladder)
| Sub-problem | Reused |
|---|---|
| Auth/sessions/roles | Better Auth |
| ORM/migrations | Prisma |
| Embeddings + vector search | pgvector + provider embeddings |
| 3D rendering/camera | three.js + react-three-fiber + drei |
| Graph layout | d3-force-3d force simulation |
| Streaming AI UI | Vercel AI SDK |
| UI components | shadcn/ui, NativeWind |
| PDF parsing | pymupdf |
| Video metadata | YouTube Data API + oEmbed |
| Prior art (patterns only) | MapScribe.ai, adaptive-knowledge-graph, Enterprise DNA generator |

### 0C Dream state
CURRENT: nothing exists → THIS PLAN: personal 3D learning maps + credited sources + companion bot, self-hostable → 12-MONTH IDEAL: community-composable curriculum graph with permissioned updates, mentor coffee chats, help broadcasts, events, store apps. Delta after v1: one release away from the differentiating community layer; composition schema already in the DB so no migration cliff.

### 0D Scope decisions (SELECTIVE EXPANSION)
- **APPROVED expansion (P2 boil-lakes, <1d CC, in blast radius):** read-only publish/share link for maps in v1 (visibility flag already in schema; public route + OG card). Rationale: gives v1 a community hook, directly mitigates the P2 "me too" risk. → added to M3.
- **APPROVED expansion (P1 completeness, <1d CC):** validate every AI-proposed YouTube/blog URL via oEmbed/HEAD before persisting — hallucinated-source defense. → added to M2.
- **APPROVED expansion (P1, security):** email verification + per-IP signup rate limit (quota-farming defense). → added to M1.
- **DEFERRED (outside blast radius → TODOS.md):** Mentor Match, events, composition UI, moderation tooling, i18n, offline mode, native store release (v1.5), brand-guide execution.
- **REJECTED (P4 DRY):** building a custom vector store or custom auth — reuse pgvector/Better Auth.

### 0E Temporal interrogation
HOUR 1 (new user): land → sign up (13+ gate) → topic → skeleton map appears <15s → first section content <60s p90 → progress saved. HOUR 6+ (returning): map resumes at last node, bot recalls progress, quota resets daily. Weakness examined: nothing pulls the user back (no email digest in v1) — deferred to TODOS with rationale (retention loop needs real usage data first).

### 0F Mode confirmation
SELECTIVE EXPANSION confirmed — plan is complete for the v1 wedge; expansions above approved; nothing reduced (P2: never reduce).

### Error & Rescue Registry (user-facing)
| Error | User sees | Rescue |
|---|---|---|
| Generation job fails | Section shows "generation failed" + retry | Retry re-enqueues; partial blocks persisted |
| Daily quota hit | Quota banner with reset time | Admin-tunable; bot degrades to retrieval-only |
| Global spend cap | "Queued — come back later" + position | Job runs when cap resets |
| PDF parse failure | Explicit error + "try text paste" | Text-paste path |
| YouTube quota exhausted | "Video suggestions unavailable, retry later" slots | Async enrichment retries |
| Device below 3D budget | Automatic 2D map view, no error | Setting to force-try 3D |
| Auth failure / underage | Clear message at signup | 13+ policy page link |

### Failure Modes Registry
| Failure mode | Mitigation | Critical gap? |
|---|---|---|
| AI cost blowout | Quotas, token ceilings, global spend cap, per-day spend metric | No |
| Quota farming via mass signups | Email verification + IP rate limit (added M1) | No |
| Prompt injection via PDF/web content into generation or bot | Source content fenced as data; fixed tool allowlist; no tool execution from retrieved text (added M2/M4) | No |
| Hallucinated source URLs | oEmbed/HEAD validation before persist (added M2) | No |
| Creator regenerates map under a learner | Stable node slugs + old→new mapping + archived progress | No |
| Neon/Railway outage | Stateless services, Postgres single source of truth; self-host escape hatch | No |
| Minor-safety (13-17) | Age gate, minor-safe bot prompts, mentor features excluded until v2 trust design | Legal review pending (dependency) |

### NOT in scope (v1)
Mentor Match, help broadcasts, events, map-composition UI + update proposals (schema only), community discovery feed, moderation tooling, i18n, offline mode, store-released mobile apps (v1.5), brand-guide execution, email retention loops.

### CEO Dual Voices — [subagent-only] (Codex CLI not installed)

CLAUDE SUBAGENT (CEO — strategic independence), key findings:
- **1.1 (CRITICAL):** v1 builds the commodity (map generation — 5 OSS rivals + frontier-lab study modes) and defers the moat (EEF's human network) to v2. Fix: at least one human touchpoint in v1, seeded from EEF alumni/mentor pool.
- **2.1 (CRITICAL):** validation (5 learner interviews) sequenced after the build. Fix: interviews before M2.
- **2.2/2.4 (HIGH):** 3D is aesthetic not strategic and the costliest item; solo-maintainer scope is 3–5x over budget; cut Expo scaffold from v1.
- **4.1/4.2 (HIGH/MED):** Approach A rejected circularly (citing the 3D mandate it challenges); no-build cohort and connection-first wedges never priced.
- **5.1/5.2:** frontier labs (study modes, Khanmigo/LearnLM) are the real competitor, not OSS generators; coffee-chat apps have the humans and could add maps faster than EEF adds community.

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                             Claude   Codex  Consensus
  ─────────────────────────────────────  ───────  ─────  ─────────
  1. Premises valid?                     PARTIAL  N/A    FLAGGED
  2. Right problem to solve?             PARTIAL  N/A    FLAGGED
  3. Scope calibration correct?          NO       N/A    FLAGGED (critical)
  4. Alternatives sufficiently explored? NO       N/A    FLAGGED
  5. Competitive/market risks covered?   PARTIAL  N/A    FLAGGED
  6. 6-month trajectory sound?           NO       N/A    FLAGGED
═══════════════════════════════════════════════════════════════
```

**Resolution per autoplan rules:** the user's original direction is the default; single-voice critical findings are flagged at the Final Gate as challenges UC-1..UC-5 (see gate), not auto-adopted. Non-challenge improvements adopted immediately: frontier-lab competitive positioning, EEF alumni pool named as cold-start asset, pilot-cohort acquisition criterion in M5, interviews moved before M2, stakeholder mapping added as dependency.

### CEO Completion Summary
Plan is well-constructed operationally (voice concurs: "one of the better-written plans") but the voice challenges the release strategy itself: machine-first v1 from a human-network org. 3 expansions approved, 8 deferrals logged, 0 reductions, 5 challenges queued for the gate.

> **Phase 1 complete.** Codex: unavailable. Claude subagent: 9 findings (2 critical, 4 high).
> Consensus: 0/6 confirmed, 6 flagged → surfaced at gate. Passing to Phase 2.

## Phase 2 — Design Review (UI scope detected)

### Pass findings (auto-decided, P5 explicit-over-clever)
1. **Information hierarchy (6→8/10):** map view hierarchy specified (constellation → mastery glow → companion affordance) but the returning-user dashboard was unspecified. AUTO-FIX: dashboard = resume card (current map + node) first, my-maps grid second, "new map" CTA third. → M3.
2. **Interaction states (5→9/10):** degraded modes existed; missing: first-run empty state (no maps), 3D canvas init skeleton, progressive node-appearance during generation, bot thinking state. AUTO-FIX: state spec added to M3; every screen ships loading/empty/error/success/partial. → M3.
3. **User journey (6→8/10):** emotional break found — birthdate gate + signup before any wow. AUTO-FIX: anonymous visitors can enter a topic and watch the free skeleton-only preview (~2k tokens, cheap, rate-limited by IP); signup required to generate full content and save. Wow lands before the form. → M3.
4. **Specificity (7/10):** 3D flow concrete; visual identity intentionally deferred to brand guide with placeholder tokens. TASTE DECISION T-1: ship v1 on neutral placeholder tokens vs blocking on brand guide — recommend placeholder (bias to action). 
5. **Accessibility (2→8/10):** was unaddressed. AUTO-FIX (completeness P1): `prefers-reduced-motion` disables camera flight (instant transitions); the 2D map doubles as the keyboard-navigable/screen-reader view and is always reachable, not only below perf budget; ARIA landmarks on content blocks; WCAG AA contrast in tokens; 44px touch targets. → M3.
6. **Responsive (6→8/10):** AUTO-FIX: section view single column on mobile; pinned mini-map collapses to a bottom-sheet toggle; 3D gets touch orbit controls or auto-2D below budget. → M3.
7. **Design-system alignment (N/A):** no DESIGN.md yet; `packages/ui-tokens` is the seed. Brand guide is a launch dependency, not a build dependency.

### Design Dual Voices — [subagent-only]

CLAUDE SUBAGENT (design — independent review) key findings (converged with passes 5/6 on a11y + mobile; new adopted findings):
- **5.1 (CRITICAL) scroll ownership undefined** → scroll-mode state machine adopted into M3 (explicit continue, Escape/back, URL per node).
- **5.2 (HIGH) implicit quota burn from scroll-triggered generation** → explicit "continue ↓" triggers adopted.
- **5.3 (HIGH) 2D fallback parity undefined** → parity constraint adopted (only the map canvas differs).
- **5.6 (MED) public share page undesigned** → share-page spec adopted.
- **4.1/4.2 (HIGH) UI generic, 3D scene unspecified** → interim visual spec + 3D interaction spec adopted; full brand guide remains deferred (TASTE T-1 stands).
- **2.1 map reveal** → progressive node-reveal spec adopted.

```
DESIGN LITMUS SCORECARD (post-amendment):
═══════════════════════════════════════════════════════════
  Dimension                       Claude   Codex  Consensus
  ─────────────────────────────── ───────  ─────  ─────────
  1. Information hierarchy        PARTIAL→YES N/A  fixed in plan
  2. States fully specified       PARTIAL→YES N/A  fixed in plan
  3. Journey emotionally sound    PARTIAL→YES N/A  anon preview + quota copy + return greeting
  4. UI specific enough to build  NO→PARTIAL  N/A  interim visual spec adopted; T-1 taste at gate
  5. Accessibility                NO→YES      N/A  fixed in plan (a11y baseline)
  6. Responsive intentional       NO→YES      N/A  fixed in plan (mobile spec)
  7. 3D experience well-designed  PARTIAL→YES N/A  scroll state machine + interaction spec
═══════════════════════════════════════════════════════════
```

> **Phase 2 complete.** Codex: unavailable. Claude subagent: 12 findings (2 critical, 5 high) — all structural ones auto-fixed into M3, 1 taste decision (T-1 interim tokens vs brand-blocked) → gate.
> Passing to Phase 2.5 (DX).

## Phase 2.5 — DX Review (developer-facing scope: OSS contributors + self-hosters)

### Developer journey map
| Stage | Experience | Friction found | Fix |
|---|---|---|---|
| 1. Discover | GitHub README | No live demo link at creation | README links hosted instance when live; screenshots/GIF at M3 |
| 2. Evaluate | README quickstart | Three runtimes (Node+pnpm, Python+uv, Postgres) scares evaluators | docker-compose-only path needs zero local toolchain |
| 3. Clone | `git clone` | — | — |
| 4. Install | `pnpm i` / compose pull | Python env for apps/ai | uv + lockfile; compose path skips it entirely |
| 5. Configure | `.env` | **AI key required to see anything work** | **`AI_PROVIDER=mock` ships canned deterministic maps/content — zero keys to hello world** |
| 6. Run | `docker compose up` | pgvector image, migrations, seed ordering | compose runs migrate+seed on boot; `pnpm dev:setup` for contributor path |
| 7. First success | generate a demo map | undefined "it works" moment | seed includes a demo map; README names the moment ("open localhost:3000, click Demo Map") |
| 8. Modify | contributor loop | monorepo orientation | docs/architecture.md with the ASCII diagram + package map |
| 9. Upgrade | new versions | schema drift fear | Prisma migrations, semver tags, CHANGELOG, migration notes |

### TTHW assessment
Pre-fix: ~30–45 min (three runtimes + required AI key + undocumented ordering) = NO. Post-fix target: **≤ 8 min** via `git clone && cp .env.example .env && docker compose up` with mock provider default in `.env.example`.

### Developer empathy narrative
"I found EEF Learn on GitHub. The README says three commands and no API keys needed. Compose pulls, migrations run themselves, and localhost:3000 shows a seeded demo map I can fly through. When I add my real OpenAI key later, boot validation tells me exactly which var it wants and links the doc. I fixed a label bug in the 3D view the same evening because docs/architecture.md told me exactly which package owns it."

### DX auto-decisions (adopted → M0/M2)
- Mock AI provider (`AI_PROVIDER=mock`) with deterministic canned outputs — also powers CI e2e tests without spend (P1 completeness)
- Boot-time env validation both services (zod / pydantic-settings): every missing/invalid var errors with problem + cause + fix + docs link (P1)
- `.env.example` fully commented; compose runs migrate + seed on boot; `pnpm dev:setup` one-shot for contributors
- Docs at repo creation: README (quickstart, demo moment), CONTRIBUTING.md, docs/architecture.md (ASCII diagram + package map), docs/self-hosting.md, docs/kb/ seed, LICENSE (MIT), CODE_OF_CONDUCT.md
- Escape hatches documented: AI provider/model env-switchable both services, quotas admin+env tunable, BYO YouTube key, every EEF-hosted default overridable
- TASTE DECISION T-2: default AI provider for hosted instance (cost vs quality) — deferred to gate; mock is the repo default either way

### DX Scorecard (post-amendment)
| Dimension | Score |
|---|---|
| Getting started (TTHW ≤8 min, zero keys) | 9/10 |
| Naming consistency (guessable env/API names) | 8/10 |
| Error actionability (boot validation contract) | 9/10 |
| Docs completeness at creation | 8/10 |
| Upgrade safety (migrations, semver, CHANGELOG) | 8/10 |
| Dev environment friction | 8/10 |
| Escape hatches | 9/10 |
| CI/test ergonomics (mock-powered e2e) | 8/10 |

### DX Dual Voices — [subagent-only]

CLAUDE SUBAGENT (DX — independent review): 14 findings, 2 critical, converging on the same top fixes independently discovered in the primary pass (mock provider default, .env.example + seed + clean-clone CI at M0). Newly adopted: local-dev mail story (console links + Mailpit + `AUTH_EMAIL_VERIFICATION=off`), shared AI provider env contract across both runtimes incl. `AI_BASE_URL` for local models, embeddings dimension tracking + re-embed job, optional Google OAuth, docs/upgrading.md, operator error contract, canonical env table.

```
DX DUAL VOICES — CONSENSUS TABLE (post-amendment):
═══════════════════════════════════════════════════════════
  Dimension                      Claude       Codex  Consensus
  ─────────────────────────────  ───────────  ─────  ─────────
  1. Getting started < 5 min?    NO→YES(mock) N/A    fixed in plan
  2. API/CLI naming guessable?   PARTIAL→YES  N/A    env contract fixed
  3. Error messages actionable?  NO→YES       N/A    operator contract added
  4. Docs findable & complete?   PARTIAL→YES  N/A    M0 docs list fixed
  5. Upgrade path safe?          NO→YES       N/A    upgrading.md + re-embed
  6. Dev env friction-free?      PARTIAL→YES  N/A    mail story + dev:setup
═══════════════════════════════════════════════════════════
```

### DX Implementation Checklist
- [ ] `.env.example` fully commented, mock default (M0)
- [ ] Boot env validation w/ actionable errors, both services (M0)
- [ ] Mock provider: maps, sections, chat, embeddings (M0/M2)
- [ ] Mailpit + console verification links (M1)
- [ ] Shared AI env contract + `AI_BASE_URL` (M0/M2)
- [ ] Embedding dimension registry + re-embed job (M2)
- [ ] Clean-clone compose smoke in CI (M0)
- [ ] docs: architecture, self-hosting (env table), upgrading (M0)

> **Phase 2.5 complete.** DX overall: 8.4/10 post-amendment. TTHW: 45–90 min → ≤8 min (mock, zero keys).
> Codex: unavailable. Claude subagent: 14 findings, all adopted or already converged; T-2 (hosted default provider) → gate.
> Passing to Phase 3 (Eng — reviews the final amended plan).

## Phase 3 — Eng Review

### Architecture

```
                       ┌───────────────────────────────┐
  browser ───────────▶ │ apps/web  (Next.js App Router)│
  React + R3F/2D map   │  Better Auth · route handlers │
  SSE subscribe        │  AI SDK chat (companion bot)  │
                       └───────┬───────────────┬───────┘
                               │ Prisma        │ REST + bearer AI_SERVICE_TOKEN (TLS)
                               ▼               ▼
                       ┌──────────────┐  ┌─────────────────────────┐
                       │  Postgres    │◀─│ apps/ai  (FastAPI + uv) │
                       │  + pgvector  │  │ workers: mapgen ·       │
                       │  graph·jobs· │  │ sections · enrich ·     │
                       │  vectors·auth│  │ embed · pdf             │
                       └──────▲───────┘  └───────────┬─────────────┘
                              │ checkpoint polling   │ shared AI env contract
                              │ (LISTEN/NOTIFY =     ▼
                              │  self-host opt only)
                              │            mock │ OpenAI │ Anthropic │ Google │
                              │            OpenAI-compatible (Ollama) · YouTube API · oEmbed
  apps/mobile (Expo scaffold) ──▶ same web API (v1: dev only)
  packages/: db (Prisma) · core (domain types/logic) · ui-tokens
```

Coupling assessment: web and ai never call each other's internals — Postgres is the single coordination point (jobs, checkpoints, vectors) and the REST surface is enqueue/retrieval only. The mobile scaffold consumes the public web API, no private coupling. Scaling: both services stateless; jobs lease-based so ai replicas scale horizontally.

### Eng auto-decisions (adopted, primary + voice consolidated)
- **Job leases + heartbeats + `FOR UPDATE SKIP LOCKED` claiming + reaper + attempts/backoff** on GenerationJob (worker crash → timeout requeue; replicas never double-process) — M1 schema + M2 worker (P1; 2am-Friday scenario 1; eng A2)
- **Duplicate-job defense**: partial unique index on active jobs; second trigger attaches to existing checkpoints (M1; eng E1)
- **Atomic quota decrement + spend reservation/reconcile + failure refunds + UTC reset** (M2; eng E2)
- **Optimistic concurrency on Progress** (updatedAt guard) — two tabs racing don't corrupt mastery state (P5)
- **map_version on checkpoints + progress writes** → typed stale-version error → reload banner (M3; eng E4)
- **Sanitized markdown rendering + CSP** on all AI/user content incl. share pages (rehype-sanitize) (P1, security)
- **SSRF hardening** of the URL-validation feature: allowlist, private/metadata IP blocking, no internal redirects (M2; eng S1)
- **RAG visibility scoping** on every vector/FTS query; single `/retrieve` endpoint on the AI service (M2/M4; eng S2/A4)
- **Server-side tool re-authorization** for all bot tools (M4; eng S3)
- **PDF hardening**: 20MB, MIME + magic-byte check, page cap, parse timeout, in worker not request thread (P1)
- **AI provider backoff + circuit breaker** → jobs flip to queued, never hot-loop spend (P1)
- **Generation-side failure registry** (malformed LLM JSON + one repair-reprompt, degenerate graphs, empty PDF, all-sources-invalid) (M2; eng E5)
- Deploy order (migrate → ai → web) + AI-service schema-compat boot check (eng A3)
- Anonymous-preview global budget + topic-normalized cache + dormant Turnstile (M3; eng E3)
- Embedding dimension boot guard + re-embed job (from DX phase, confirmed here)

### Eng Dual Voices — [subagent-only] (Codex CLI not installed)

CLAUDE SUBAGENT (eng — independent, no prior review context): 16 findings (1 critical, 6 high). Key:
- **A1 (CRITICAL, sole finding the primary pass missed at this severity):** LISTEN/NOTIFY + long-lived SSE is incompatible with the chosen hosted stack — Neon's pooled connections can't `LISTEN`, direct-connection caps are in the tens, Vercel functions can't affordably hold long streams, and Neon autosuspend kills LISTEN sessions. Worst property: docker-compose + CI pass, **only production fails**. ADOPTED: checkpoint polling is the primary transport (resume tokens, reconnect-safe); LISTEN/NOTIFY demoted to self-host-only optimization with signal-only payloads.
- **A2/E1/E2 (HIGH):** no job claiming/crash recovery; duplicate-job double-spend; quota/spend check-then-act races. ADOPTED (converged with primary pass, strengthened with SKIP LOCKED + partial unique index + atomic decrement + spend reservation).
- **E3 (HIGH):** anonymous preview is the top cost-DoS funnel at 10x. ADOPTED (global preview budget + topic cache).
- **S1 (HIGH):** the hallucinated-URL defense itself creates an SSRF surface (server-side fetches of AI-proposed URLs → cloud metadata endpoints). ADOPTED.
- **S2/S3 (HIGH/MED):** RAG tenant scoping; bot tool re-authz. ADOPTED.
- **T1 (HIGH):** "CI plumbing, not a test strategy" — cross-runtime contract tests (TS↔Python over shared checkpoint/job shapes) named the single highest-value test investment; mock-only posture guarantees green CI over broken prod. ADOPTED: contract suite + scheduled real-provider canary (non-PR, schema-validates real LLM output) + authz test set added to the test plan artifact.
- A3/A4/E4/E5 (MED): migration ordering, retrieval ownership, regen-vs-active-learner, generation-side nil paths. ALL ADOPTED.

```
ENG DUAL VOICES — CONSENSUS TABLE (post-amendment):
═══════════════════════════════════════════════════════════════
  Dimension                    Claude          Codex  Consensus
  ───────────────────────────  ──────────────  ─────  ─────────
  1. Architecture sound?       PARTIAL→YES     N/A    fixed in plan (A1 transport redesign)
  2. Test coverage sufficient? NO→YES          N/A    contract tests + canary + authz added
  3. Performance risks?        PARTIAL→YES     N/A    connection/dup-job/preview-cost fixed
  4. Security threats covered? PARTIAL→YES     N/A    SSRF + RAG scoping + tool authz added
  5. Error paths handled?      PARTIAL→YES     N/A    machine-facing failure registry added
  6. Deployment risk?          PARTIAL→YES     N/A    deploy order + schema-compat boot check
═══════════════════════════════════════════════════════════════
```

Voice's pre-M2 blockers (4 paper-only amendments) — all four are now in the plan: (1) transport redesign ✓ M3, (2) job claiming/heartbeat/retry spec ✓ M1/M2, (3) SSRF/RAG-scoping/tool-authz ✓ M2/M4, (4) test strategy ✓ artifact + M0 CI.

### Test plan
Artifact: `~/.gstack/projects/Learn/thefacilitator-main-test-plan-20260913.md` — codepath→coverage diagram, 5 named 2am-Friday scenarios, 3 LLM eval suites (skeleton quality, groundedness, injection resistance), plus (post-voice) cross-runtime contract suite, scheduled real-provider canary, and authz matrix (share-page visibility, creator-only regenerate, SSE/checkpoint access). Mock provider keeps every PR suite at zero AI spend.

### What already exists (greenfield)
Nothing in-repo; reuse ladder per Phase 1 leverage map (Better Auth, Prisma, pgvector, R3F/drei, d3-force-3d, AI SDK, shadcn/ui, pymupdf, oEmbed). No DRY violations possible yet; the shared `packages/core` domain layer is the guard against web/ai logic duplication.

### NOT in scope (eng view)
Confirms Phase 1 list; additionally: no Redis/queue infra (Postgres jobs suffice at v1 scale — revisit >10 jobs/sec), no k8s (compose + PaaS), no microservice split beyond the one web/ai boundary.

> **Phase 3 complete.** Codex: unavailable. Claude subagent: 16 findings (1 critical, 6 high) — all adopted; the critical A1 (LISTEN/NOTIFY unworkable on Vercel+Neon) forced a transport redesign to checkpoint polling, caught before a line of code exists.
> All six eng verdicts YES post-amendment. Passing to Final Gate.

## Final Approval Gate — APPROVED (2026-09-13)

User decisions:
- **UC-1 CONFIRMED:** web-first v1; Expo scaffold in monorepo day one, store releases v1.5.
- **UC-2 ADOPTED:** manual "request a coffee chat" button on map completion in v1 — form → EEF manually matches from alumni pool. No matching engine. → added M4.
- **UC-3 CONFIRMED:** true 3D stays in v1 behind the spike gate (third confirmation of D4/D12).
- **UC-4:** interviews run parallel to build; inform, don't block.
- **UC-5 ADOPTED:** positioning statement (never compete with frontier labs on generation quality; compete on community graph, attribution lineage, EEF's human network) goes in README + docs.
- **T-1 OVERRIDDEN (user):** brand guide moves INTO v1 and is created NOW, before scaffold — using emilkowalski/skill + Leonxlnx/taste-skill + impeccable design skills; design language spans the new EEF website ↔ EEF Learn. Interim-spec plan superseded.
- **T-2 (user):** hosted provider = **OpenRouter** — per-task model routing (cheap models for enrichment/embeddings-adjacent tasks, stronger models for skeleton/section generation) through one OpenAI-compatible API. Repo default remains mock. `AI_PROVIDER=openrouter` + `AI_BASE_URL=https://openrouter.ai/api/v1` fits the existing env contract; add per-task model map (`AI_MODEL_SKELETON`, `AI_MODEL_SECTION`, `AI_MODEL_CHAT`, `AI_MODEL_ENRICH`) with `AI_MODEL` as fallback for all.

Amendments from gate: M4 += coffee-chat request button (v1 human touchpoint); M0/M2 env contract += per-task model map; M-pre += brand guide deliverable (docs/design/BRAND.md + tokens).

> **/autoplan complete.** Plan APPROVED. Next: brand guide → repo creation → M0 scaffold.
