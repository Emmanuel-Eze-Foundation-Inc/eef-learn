## Learned User Preferences

- Ship work ticket-by-ticket: build, review, QA, then push and merge to `dev`. `dev` is the integration/staging branch; `main` is publish-only.
- Opening a learning map should put the learner inside a 3D travel world, not a normal document page. Scroll travels stage-to-stage. The map path should wrap the current beat on left and right, connecting previous and next at the content edges (vertebra/root, not behind the card); distant nodes stay visible. A side map still jumps between nodes.
- Keep the current beat in focus (ADHD-friendly). 3D motion should draw the learner in as they progress, including mixed content types such as YouTube.
- Mini-map nodes should show the actual content type, not generic stars. Hover for a description; click to enter learn mode. The active beat is the 3D center stage, with previous/next around it. Start and end nodes should be clearly labeled. Completed nodes should come alive on the side map; uncompleted nodes should show an incomplete state.
- Keep travel animated. Arrow keys (up/down/left/right) control the map. On long-form beats, arrows scroll the content first; advancing takes an extra scroll past the end (same at the top, with a cue). Show a creative scroll-affordance so long content does not look cut off. Optional click-to-continue is fine. Blend edges instead of hard cuts.
- Map completion should be animated, then prompt the user to go back to maps.
- Market Unseen Engine (myunseenengine.com) as sponsor instead of an in-map coffee-chat option. Treat it as a standout ad (paper-on-night billboard on the landing); use the real Unseen Engine mark as the logo. It is also the official sponsor on the Foundation site.
- Community maps should lead with search and combine hemisphere/globe with a list. Cards show that map’s real nodes plus title, description, and publisher; the atlas/board wall should feel maplike with nodes.
- Landing page: sticky night-sky nav; hero with a topic field and two actions — Watch it build, and View community maps (the latter goes to the community maps page, not an in-page section). Sticky constellation on the right, stacking under the hero on mobile. How-it-works is an animated path matching real travel and creation (create or pick a map, enter, learn), using path language (e.g. “The sky is the syllabus”), not generic cards or heavy star-talk. Preview is free; Enter map needs an account. Close with open-source plus a second topic form.
- Foundation site: tell the evolution from food and education to bootcamps (8 bootcamps, 1k+ children) to a 1M completed-maps-by-2035 vision. No donate button — partnership and volunteer-to-lead-a-series / host-a-community-event forms instead. Include socials (and social posts when practical); a short founder bio that links to the portfolio.
- Map creation should match that loop in studio: prompt AI with the user’s OpenRouter key or build from scratch, edit individual blocks, define parent-child (and grandchild) relationships as a node graph, then review, publish, and enter.
- Share preview should be a full map (Figma-inspired): the travel order is the map itself; clicking a node is how someone decides to enter.

## Learned Workspace Facts

- Turborepo + pnpm monorepo: `apps/web` (Next.js), `apps/mobile` (Expo scaffold), `apps/ai` (FastAPI); shared `packages/db` (Prisma), `packages/core`, `packages/ui-tokens`.
- Auth is Better Auth (self-hostable). Data layer is Postgres + pgvector.
- Git remotes use `dev` for integration, `staging` alongside it, and `main` for published releases.
- Learning maps are knowledge-graph journeys with typed blocks (YouTube, blogs, AI text, PDF, flashcards, quizzes) and parent-child nested nodes. Regeneration is creator-only when enabled. Quizzes/flashcards tell the learner right or wrong only (radio + multi-select); they do not record scores.
- Share and community views are a public full-map preview; clicking a node is how you enter. Traveling a map and saving progress requires an account (`/share/[slug]` vs `/maps/[slug]`).
- New maps start from a topic via “Watch it build” (BYOK OpenRouter, encrypted at rest, unless mock generation is enabled) or from-scratch in studio: edit blocks, parent-child node graph, review, and publish.
- This repo also serves the Emmanuel Eze Foundation site. Partnership and volunteer inquiries are stored in the DB. Public contact is 216 T Street, Washington DC and admin@emmanuelezefoundation.org.
- Distinct EEF vs EEF Learn marks with light/dark variants; EEF should be identifiable at a glance on the site and socials. Brand files live in `apps/web/public/brand` and the EZE CNS brand folder; Figma is the source for the Learn prototype and logos.
