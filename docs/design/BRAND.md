# EEF Learn — Brand Guide

Status: v2.0 "Aurora" (2026-09-13) · Created per final-gate decision T-1, revised per prototype-review feedback (palette change, dual themes, imagery, motion) · Spans the new EEF website and the EEF Learn app.
Companion artifacts: Figma file "EEF Learn — v1 Prototype" (source of truth for screens, variables, and motion spec panel), `docs/design/prototype/` (exported reviews), `packages/ui-tokens` (implementation, M0).

## 1. Brand strategy

| | |
|---|---|
| Category | Community learning platform by a nonprofit foundation |
| Audience | Adults who stalled self-learning; contributors; EEF's community |
| Emotional promise | "You are not lost, and you are not alone." |
| Core metaphor | **The next star, under an aurora.** A learning map is a constellation. Every node you master lights up gold. The aurora — the living green light — is the path the AI draws between the stars, and the path you have already traveled glows with it. |
| Personality | Warm, direct, unhurried, credible. A patient guide, never a gamified slot machine. |
| Avoid | EdTech gamification kitsch (badges, streaks, confetti), AI-purple gradients, corporate nonprofit beige, dark-pattern urgency |

Three brand forces, held in tension everywhere: **the night sky** (deep green-black: vast, calm), **the gold star** (the human achievement: mastery, coffee chats, people), and **the aurora** (the machine: the generated path, alive and in motion). Gold is earned; aurora is offered.

The green-and-gold pairing is also a quiet nod to the foundation's Nigerian roots — never literal flag-waving, always atmosphere.

## 2. Logo system

**Mark: the Waypath.** Four nodes joined by an ascending polyline; the first three are small filled dots, the terminal node is a four-point star (the next star, lit). Drawn as a single stroke it reads as a route on a map; in negative space the rising line forms an implicit upward arrow.

- Construction: nodes sit on a 4×4 grid at (0,3), (1,2), (2,2.4), (3.2,0.8); stroke = 1 grid unit at icon sizes; terminal star = 1.6× node diameter.
- Variants: icon (mark only, app icon / favicon), horizontal lockup (mark + "EEF Learn"), stacked lockup, foundation lockup (mark + "EEF Learn" + "by Emmanuel Eze Foundation" in mono small caps).
- Color: path renders in Star White on dark, Ink on light; ONLY the terminal star may take Gold. Never multicolor.
- Clear space: one node diameter on all sides. Minimum size: 16px icon, 96px horizontal lockup.
- The mark doubles as UI: the map's node states are drawn from the same geometry (see §5).

**Wordmark:** "EEF Learn" set in Satoshi Bold (Outfit substitutes in Figma), tight tracking (-0.02em). Foundation line set in JetBrains Mono 0.7em uppercase, tracked +0.08em.

## 3. Color — the Aurora system

Two accents with strict roles: **gold = human/earned**, **aurora = machine/offered**. The night provides the range.

Both themes ship in v1. The app defaults to dark ("night"); light ("day") is a first-class user preference. The Figma variable collection "EEF Brand" carries both modes; every token below is a variable, and screens re-theme by mode.

| Token | Dark (night) | Light (day) | Role |
|---|---|---|---|
| `night-950` | `#06100C` | `#F7F5EF` | App background (the sky / the paper) |
| `night-900` | `#0B1A13` | `#FFFFFF` | Surface / cards |
| `night-800` | `#16281F` | `#E3E0D6` | Elevated surface, borders |
| `star-100` | `#EDF5EE` | `#0F1D17` | Primary text |
| `star-400` | `#8FA89A` | `#4A5A50` | Secondary text |
| `aurora-400` | `#34D98C` | `#0E7A55` | THE action accent: CTAs, current position, generation, focus rings |
| `aurora-600` | `#0E7A55` | `#34D98C` | Accent hover / light-surface accent |
| `gold-400` | `#F2C14E` | `#F2C14E` | Earned only: mastered stars, traveled path, coffee-chat features |
| `paper-50` | `#F7F5EF` | `#FFFFFF` | Marketing light surfaces |
| `ink-900` | `#0F1D17` | `#F7F5EF` | Text on accent fills |
| `ok-500` / `err-500` | `#0E7A55` / `#C94343` | same | Semantic only, never decorative |

Rules:
- **Gold is never a button.** You cannot click your way to gold; it appears only on things the learner earned (mastered nodes, traveled path, completion moments) and on human features (coffee chat iconography).
- **Aurora is never a reward.** It marks what the system offers: CTAs, the current position halo, generation-in-progress, the path ahead.
- WCAG AA minimum everywhere (`aurora-400` on `night-950` = 9.1:1; `star-100` on `night-950` = 15+:1; `aurora-400`-as-`#0E7A55` on `paper` = 5.6:1). No pure black/white. The only gradient permitted is the aurora glow itself (a soft `aurora → gold` trail behind the traveled path) and a single radial sky backdrop.
- The EEF website leads light with one night-panel section (the window into the app); the app supports both modes and never mixes them mid-screen.

## 4. Typography

| Role | Face | Notes |
|---|---|---|
| Display / headlines | **Satoshi** (Fontshare, self-hosted; Outfit in Figma) | Bold, `tracking-tight`, `text-4xl→6xl`; max 2-line headlines |
| UI / body | **Satoshi** Regular/Medium | `text-base`, `leading-relaxed`, `max-w-[65ch]` |
| Provenance / metadata | **JetBrains Mono** | Attribution lines, model provenance, node coordinates, quotas — everything "from the machine" is mono |

The mono face is semantic: whenever the interface states a fact about sources or generation ("Source: 3Blue1Brown · YouTube", "Generated · 2026-09-13 · built on 2 sources"), it is set in mono. Readers learn the rule without being told. No serifs anywhere. No em-dashes in UI copy; hyphens or periods.

## 5. The map language (product-specific system)

Node states — shape + color, colorblind-safe, derived from the logo geometry:
- **Unvisited:** hollow circle, `star-400` stroke
- **In progress:** half-filled circle, `star-100`
- **Mastered:** four-point star, `gold-400` (the logo's terminal star, earned)
- **Locked (prereq unmet):** hollow circle, dashed stroke, 40% opacity
- **You are here:** `aurora-400` filled core with double halo ring + pill label — the only aurora node on the map
- Edges: traveled path = solid `gold-400` with an aurora glow trail; path ahead = dashed `aurora-400`; unrelated edges = `night-800`

The learning area (travel view) is the brand's hero surface: gold behind you, aurora ahead of you, one bright "you are here." Progress is stated in mono ("NODE 15 OF 22 · 4 BEHIND YOU · 7 AHEAD") — never as a percentage bar alone.

## 6. Motion grammar

Documented as a live spec panel in the Figma file; prototype flows use smart-animate. Implementation targets:

| Motion | Spec |
|---|---|
| Star ignition (node mastered) | scale 0.6→1.15→1.0 + gold bloom · 600ms · spring(0.35) · fires once, never loops |
| Camera travel (map → node) | dolly along path spline · 800ms · ease-out-cubic · arrival halo pulse · 3D: r3f camera lerp / 2D: pan+zoom |
| Aurora path draw | traveled edge draws on with glow trail · 400ms per edge · stagger 80ms |
| Scroll grammar (section view) | scroll advances content; block boundary nudges mini-map camera 1 node · 120ms linear |
| Content arrival | fade + rise 12px · 240ms ease-out · stagger 60ms · skeleton shimmer while generating |
| Coffee chat modal | scrim 200ms + modal scale 0.96→1.0 rise 16px · 280ms ease-out · constellation drifts slowly behind |
| Reduced motion | all travel → 150ms crossfade; no parallax, no drift; star ignition → instant state change |

Nothing on screen animates perpetually. `prefers-reduced-motion` parity is a feature, not a fallback.

## 7. Imagery

Photography is the human layer's voice — it appears wherever people do (website community section, coffee-chat surfaces, event pages), never inside the map itself.
- Real people mid-conversation, warm golden-hour light, shallow depth of field. Environments that echo the palette: deep greens, brass/gold, warm wood.
- Documentary energy, not stock-smile clichés. Laughter over poses. Notebooks with node sketches are an easter egg motif.
- The map surfaces stay photography-free: constellation, aurora, and typography only.

## 8. Voice

Warm, specific, second person, zero punishment framing.
- Quota: "You've created 3 maps today. Dive into one; more tomorrow." (never "limit reached")
- Return: "Welcome back. You were halfway through *Linear Algebra* — the next star is Eigenvectors."
- Error: say what happened, what it means, what to do — in that order, one line each.
- The bot speaks like a well-read friend, not a mascot. No exclamation-mark stacking, no "Oops!".
- Attribution is stated with pride, not fine print: "Built on 4 sources and 1 community map."
- Coffee chat honesty: "A real person at EEF matches you by hand." Human process, stated plainly.

## 9. Applications

- **EEF website (emmanuelezefoundation.org refresh):** `paper` light surfaces, same type pairing, Waypath mark in Ink; deep-emerald CTAs. One night-panel section presents the Learn product — the window into the app. Community photography per §7.
- **EEF Learn app:** dual-theme, sky backdrop, map language per §5. Dark is default; light is a respected preference, not an afterthought.
- **Share pages / OG cards:** night background, map title in display face, node-count + Waypath mark, foundation lockup bottom-left.
- **App icon:** Waypath mark, `star-100` on `night-950`, terminal star in `gold-400`.

## 10. Accessibility commitments (brand-level)

AA contrast everywhere in both themes; focus visible (`aurora-400` 2px ring, 2px offset); 44px touch targets; shape+color state encoding (never color alone); reduced-motion parity; the 2D map is a first-class view, not an apology.
