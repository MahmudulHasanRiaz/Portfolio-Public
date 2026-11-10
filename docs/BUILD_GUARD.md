# Build Guard — Portfolio-Public

This document exists so the build NEVER gets slow or stuck again. Read it before
touching the build, the loader, the gate, or the deploy setup. The rules below
were paid for in build minutes and in a night of stuck deploys (2026-11-10).
Whoever works on this repo — the owner, Muse, or any other AI agent — these
rules are binding. Do not work around them.

## The normal build

- A successful Cloudflare build takes **1–1.5 minutes, max 2 minutes**
  (Initializing ~4s, Cloning ~3s, Installing ~17s, Building ~1 min,
  Deploying ~seconds).
- If a build takes **more than 2–3 minutes in the Building phase, it is
  stuck** — cancel it and investigate. Do not let it run. Do not blind-retry
  (each retry burns quota and re-queues from the back).
- Build quota: **3000 build-min/month total** (account-wide). ~500 already used
  (2026-11-10). Batch deploys; never push test commits to "see if it builds";
  never retry without investigating first.

## Rule 1 — NEVER fetch the same live URL twice in one build (PR #38)

- During `astro build` prerender, every live API fetch MUST be memoised per
  build: each distinct URL is fetched ONCE, and repeat callers share the
  single in-flight/resolved promise.
- The cache lives in `src/loaders/public-content.ts` (`fetchJson` → per-build
  `Map<string, Promise<unknown>>`, active only during production prerender).
  **Do not remove it. Do not bypass it. Do not reintroduce per-page
  fetching.**
- What happened when this was violated (2026-11-10, build #21faeab0): the
  loader had no cross-page memoisation, so 58 pages made **204 live fetches
  for only 31 distinct URLs** (platforms 64×, projects 26×, releases 20×…).
  At ~1–3.6s per API call, the build took **7.5 minutes** in the Building
  phase and had to be cancelled. After the fix (PR #38): 31 fetches, build
  **1m 23s**.
- If you add a new live collection or a new per-page live call, route it
  through the memoised `fetchJson`. Count the fetches in a local build
  before pushing — if the count is far above the number of distinct URLs,
  you have reintroduced the bug.

## Rule 2 — NEVER close the live-build gate (PUBLIC_CONTENT_LIVE_BUILD=1)

- The gate (`isLiveFetchAllowed` in `src/loaders/public-content.ts`) MUST stay
  open at build time: `PUBLIC_CONTENT_LIVE_BUILD=1` is set as a Cloudflare
  Build Variable AND in `wrangler.jsonc` vars.
- Closing it regresses the /bn/ hero + services to English (they are baked at
  build time from the live fetch). This was the Run #45 fix — do not undo it.
- The gate exists because the build machine often cannot reach the API within
  the 8s timeout; the gate + the memoisation (Rule 1) together make the build
  both fast AND correct. Do not "simplify" by removing the gate or the
  timeout.

## Rule 3 — NEVER remove the 8s fetch timeout

- `fetchJson` uses `AbortSignal.timeout(8000)`. A hanging fetch (TLS/network
  stall) used to stall the whole build for 7+ minutes. The timeout bounds it.
  Callers already treat a failed fetch as "use build-time rows", so a timeout
  is safe. Do not remove or raise it without a measured reason.

## Rule 4 — prerenderEnvironment MUST stay "node" (PR #19)

- `astro.config.mjs` sets `prerenderEnvironment: "node"` on the Cloudflare
  adapter. Do NOT flip it back to `"workerd"` (the adapter default).
- Under `"workerd"`, `astro build` prerenders inside a workerd preview server
  where `navigator.userAgent` IS `"Cloudflare-Workers"` — the gate opens
  wrongly, every page makes 2–4 live fetches, each hangs the full 8s timeout,
  and the build takes ~20–30 min then FAILS. There is no in-workerd signal
  that separates prerender from a real request.

## Rule 5 — Stuck in Queued/Initializing = GitHub connection, NOT code

- If a build sits in "Queued" or "Initializing build environment..." for
  more than ~2 min and never reaches Cloning, the code has not run at all —
  it is the Cloudflare ↔ GitHub integration, not the repo.
- Do NOT push a test/fix commit (a new commit cannot fix a broken GitHub App
  connection, and "Disable builds" is ON so pushes never trigger builds
  anyway). Do NOT blind-retry.
- Fix: GitHub → Settings → Applications → Cloudflare Pages (or "Cloudflare
  Workers and Pages") → Configure → check the Portfolio-Public repo is in the
  access list; if in doubt, Uninstall, then re-authorize from the Cloudflare
  dashboard (Worker → Settings → Build → connect GitHub). Then trigger ONE
  deploy via the GitHub Action and watch it pass Initializing → Cloning.
- The tell-tale sign: the dashboard red banner "Error fetching GitHub User or
  Organization details" PLUS a build stuck at Initializing with no clone.
  That combination is a broken Git installation (Cloudflare docs: Debugging
  Pages).
- Safety: in the Cloudflare dashboard, do NOT press "Disconnect" on the
  project — only uninstall the GitHub app, then re-authorize from
  Settings → Build. Disconnecting could remove the project link itself.

## Rule 6 — Deploy deliberately, verify live

- "Disable builds" is ON; pushes NEVER trigger builds. Deploy only via the
  GitHub Action "Deploy to Cloudflare" (workflow_dispatch) — one trigger per
  batch, then verify live.
- Action success ≠ deploy success (it only means the hook was accepted).
  Always verify the Cloudflare build AND the live site. Verify by changed
  HTML/render, not by markers alone.
- After a deploy, the live check is: nav "Releases" (not "Nasheed"), /bn/
  hero + services in Bangla, dark-mode logos white. If the build took more
  than 2 min, something regressed — check Rules 1–5 before retrying.

## If you break one of these rules

- Revert the single-purpose commit/PR that broke it. Every change on this
  repo is a single-purpose branch/commit that reverts cleanly (rollback rule).
  Do not bundle a risky change with other work.
