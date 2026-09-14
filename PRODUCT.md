# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by user (office-hours stack round, 2026-09-13): Turborepo + pnpm monorepo. `apps/web` Next.js App Router + Tailwind v4 + shadcn/ui + react-three-fiber; `apps/mobile` Expo + NativeWind (scaffold in v1, store release v1.5); `apps/ai` FastAPI + uv; Postgres + pgvector; Better Auth; Vercel AI SDK; hosted on Vercel + Neon + Railway; self-hosted via docker-compose. Hosted AI provider: OpenRouter with per-task model routing; repo default is a mock provider.

## Users

Primary: adults (13+ permitted) who tried to self-learn a skill and stalled — they have YouTube, blogs, and AI chat but no structure, no sense of position, and nobody to talk to. Pilot cohort: 10–30 adults from EEF's alumni/family orbit. Secondary: self-hosters and OSS contributors (the repo is a public good); EEF admins who tune quotas and match coffee chats.

## Product Purpose

EEF Learn turns any topic (or an uploaded PDF) into a personal learning map — a knowledge graph of nodes with real, credited sources (YouTube, blogs, AI-generated text with provenance) — navigated as a 3D constellation the learner travels through. Content generates in realtime as they arrive; progress persists; a progress-aware companion bot answers questions about the material and the organization. Success (v1): p90 under 60s from topic to first rendered section block, and at least 10 pilot learners completing at least one section.

## Positioning

Confirmed at final gate (UC-5): never compete with frontier labs on generation quality; compete on what they cannot copy — the community-composable curriculum graph with attribution lineage (maps credit maps), and the Emmanuel Eze Foundation's real human network (coffee chats with people who finished the same map, mentor matching in v2). Machine generation is the wedge; humans are the moat.

## Operating Context

Learner flow: land → try an anonymous skeleton preview → sign up (13+ birthdate gate) → topic or PDF → skeleton map streams in under 15s → travel the 3D map → scroll into a section → content generates on explicit triggers → progress saved per block → companion bot alongside → on map completion, request a 30-min coffee chat (EEF admin matches manually from alumni pool). Creator-only per-section regeneration when admin-enabled. Read-only public share links. Daily quotas (3 maps / 30 sections / 100 bot messages) with a global spend cap; nonprofit budget.

## Capabilities and Constraints

- True 3D map navigation is a v1 commitment (user confirmed three times) with a hard performance gate: 200 nodes at 30fps on a mid-tier Android browser, else auto 2D fallback with full feature parity.
- Every content block carries attribution/provenance; AI-proposed URLs are validated before persisting; blog content is link + metadata only (copyright).
- Map regeneration preserves stable node slugs and archives progress; maps are versioned.
- Age policy 13+ with minor-safe bot prompts under 18; mentor features excluded for minors until v2 trust design (legal review pending).
- Open source (MIT), fully self-hostable with zero API keys via mock AI provider; TTHW ≤ 8 minutes.
- Not in v1: mentor matching engine, community discovery feed, map composition UI, events, moderation tooling, store-released mobile apps.

## Brand Commitments

Name: **EEF Learn**, sub-branded "by Emmanuel Eze Foundation" (emmanuelezefoundation.org). The foundation is pivoting from kids-only programs to a place anyone can learn, connect, and have coffee chats; the sub-brand contains donor-expectation risk. Brand guide is being created now (gate T-1) and must span the new EEF website and the EEF Learn app. Interim art direction seeded during design review: dark constellation palette (the learning map as a night-sky metaphor). Voice: warm, human, aspirational — quota messages read "You've created 3 maps today — dive into one; more tomorrow," never punitive.

## Evidence on Hand

- Approved design doc: `docs/designs/eef-learn-platform.md`; implementation plan with 4-phase review report: `PLAN.md`; deferred scope: `TODOS.md`.
- No testimonials, usage data, or case studies exist yet — nothing may be fabricated. Learner interviews (5+) run in parallel with early milestones.
- No existing logo/wordmark asset for EEF Learn; the foundation site exists at emmanuelezefoundation.org.

## Product Principles

1. Wow before the form — an anonymous visitor watches a map being born before signup asks anything of them.
2. Credit is a feature — every source is named, every borrowed map is credited; attribution lineage is the community's currency.
3. The map is honest — progress, position, and what remains are always visible; no dark patterns, no fake urgency.
4. Generated is labeled — AI text carries provenance; the product never passes machine output as human writing.
5. Humans are the destination — every machine feature points toward a person: a coffee chat, a shared map, a mentor.

## Accessibility & Inclusion

WCAG AA contrast; `prefers-reduced-motion` replaces camera flights with cuts; the 2D map is always reachable as the keyboard/screen-reader view; ARIA landmarks on content blocks; 44px touch targets; mastery states encoded by shape + color, never color alone (colorblind-safe).
