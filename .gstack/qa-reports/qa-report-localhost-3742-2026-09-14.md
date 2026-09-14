# QA report — localhost:3742 — 2026-09-14

**Tier:** Standard (full URL given)
**Driver:** cursor-ide-browser (Aside not installed)
**Baseline health:** 4/10 — landing nav promised community/legal pages that 404'd; hero form was a no-op; sign-in existed but unauthenticated map travel dropped the destination.
**Final health:** 8/10 — landing, community catalog, sign-in, privacy, age policy, and topic→map all verified in the browser.

## Issues found and fixed

1. **Community maps** (high) — Nav `#community` scrolled to a GitHub strip. `/community` 404. **Fix:** public map catalog at `/community`; signed-in users travel, anonymous users preview `/share`.
2. **Hero "Watch it build"** (high) — Form had no action. **Fix:** routes to `/maps/new?topic=`; unauthenticated users 307 to sign-in with `next` preserved; signed-in users auto-start generation.
3. **Privacy / Age policy** (medium) — Footer 404s. **Fix:** `/privacy` and `/age-policy` pages.
4. **Sign-in return path** (medium) — Always `/dashboard`. **Fix:** `?next=` with same-origin guard; map/section/new-map redirects pass `next`.

## Verified in browser

- Sign out → sign in → dashboard
- Landing topic "watercolor painting" → generated map
- Community catalog lists published maps (Watercolor, Rust)
- `/privacy` and `/age-policy` render
- Unauthenticated `/maps/new?topic=watercolor` → `/sign-in?next=...`

## Deferred

- Aside not available on this machine
- Community search/tags still v2
- Clicking some Next.js `<Link>`s in the embedded browser is flaky; direct navigation and form submit work

PR summary: "QA found 4 broken landing paths, fixed all 4, health score 4 → 8."
