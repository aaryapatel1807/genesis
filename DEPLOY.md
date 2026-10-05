# DEPLOY.md — Genesis Vercel deployment (Phase 10)

## One-time setup (Vercel dashboard)

1. **Import the repo**: vercel.com → Add New → Project → import
   `aaryapatel1807/genesis` (public). Framework preset: Next.js (auto-detected).
2. **Root directory**: repo root (default).
3. **Build command**: `npm run build` (default). Output: `.next` (default).
4. **Environment variables** — add both (server-side only, never exposed to the browser):
   | Variable | Value | Required? |
   |---|---|---|
   | `SERPAPI_API_KEY` | SerpApi API key | Optional — without it, live expansion degrades honestly to cache-only |
   | `GROQ_API_KEY` | Groq API key | Optional — without it, the simulator returns a labeled degraded response |
   
   > The demo works with ZERO env vars (precomputed world + snapshots are committed).
   > Keys only unlock live expansion and live simulation.
5. **Deploy**. First build takes ~2 minutes.

## Verify the deploy
- `/` → hero renders, "Generate World" routes to `/world`.
- `/world` → graph blooms, 74 nodes, layer chips toggle, time slider morphs 2020→2026.
- Click a node → NodePanel with Reality Meter. Click an edge → evidence panel.
- Simulator → cascade list + undismissable SIMULATION banner.
- DevTools → `/data/world.json` served with `Cache-Control: public, max-age=31536000, immutable`.

## Notes
- Region `bom1` (Mumbai) is pinned in vercel.json for the Indian judging audience.
- Rollback: Vercel dashboard → Deployments → ⋯ → Redeploy any previous build.
- **Demo-day rule**: freeze deploys 24h before the 10 Oct 2026, 23:59 IST deadline —
  the recorded demo build is the submitted build.
- Secrets: `.env*` is gitignored (`.env.example` is the template). Never commit keys.
