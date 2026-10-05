# Deployment.md — Genesis Deployment Plan

## Target: Vercel (free tier, ₹0)
- Framework preset: Next.js. Root: repo root.
- Build command: `npm run build` · Output: `.next` (default).
- Node 20.x.

## Environment variables (Vercel dashboard, never committed)
| Var | Required for | Notes |
|---|---|---|
| `SERPAPI_API_KEY` | Live expansion | Server-side only |
| `GROQ_API_KEY` | Expansion extraction, simulator | Server-side only |

No vars needed for the precomputed world — the demo works in pure cached mode
even with zero env configured.

## Deploy steps
1. Push `main` to GitHub (public repo — submission requirement).
2. Import repo in Vercel, add the two env vars.
3. Deploy. Verify: homepage loads → Generate → graph blooms → panels open.
4. Set the production URL in README + demo video description.

## Rollback
Vercel instant rollback to any prior deployment. Demo-day rule: **freeze deploys
24h before the deadline** — the submitted build is the recorded demo build.

## Custom domain
Not required for the hackathon. The `*.vercel.app` URL is the submission URL.
