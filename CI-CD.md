# CI-CD.md — Genesis CI/CD

## CI: GitHub Actions (`.github/workflows/ci.yml`)
Runs on every PR and push to `main`:
1. `npm ci`
2. `npm run typecheck` (tsc --noEmit)
3. `npm run lint`
4. `npm run build`

All four green = mergeable. Type errors fail the build — strict TypeScript is a DNA
technical principle ("type-safe").

> Note: fine-grained PATs can't touch `.github/workflows/*` — if the workflow file
> needs creating, do it via the GitHub web UI (same lesson as the profile README workflow).

## CD: Vercel Git integration
- Push to `main` → production deploy. PRs → preview deploys.
- No staging environment in v1; preview URLs serve that role.
- Env vars managed in the Vercel dashboard, never in the repo.

## What CI does NOT do in v1
- No world rebuild in CI (would burn SerpApi credits on every push).
- No E2E browser tests (Playwright is v2 if time ever exists — it doesn't).
- `data/world.json` and `data/snapshots/` are **committed** — the deploy works with zero
  env vars (pure cached mode); `data/cache/` and `data/build-log.jsonl` stay gitignored.
