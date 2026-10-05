# Security.md — Genesis Security Posture

## Secrets
- API keys (`SERPAPI_API_KEY`, `GROQ_API_KEY`) live ONLY in `.env` (local, gitignored)
  or host env vars (deploy). Never in code, logs, committed files, or client bundles.
- `lib/serpapi.ts` and all Groq calls run server-side (API routes / scripts) only.
  Client components never see keys.
- Pre-submit check: `git log -p | grep -i apikey` must be empty; `.env.example`
  contains placeholders only.

## Input handling
- All user inputs length-capped (topic 100 chars, scenario 200 chars).
- HTML stripped from scenario text before LLM prompt insertion (prompt-injection hygiene).
- Node ids in `/expand` validated against the world; unknown → 404, never passed to search.

## Abuse & cost protection
- `/expand` + `/simulate`: 20 req/min per IP, in-memory (v1 demo scale).
- Expansion hard-capped: ≤2 fresh SerpApi searches per call, ≤10 per session IP.
  Over cap → `429` + cached-only mode. This is the credit-budget firewall.
- `scripts/build-world.ts` refuses to run if projected cost exceeds ledger remaining.

## AI honesty (safety-critical for this product)
- The future simulator's SIMULATION label is a **response contract**, not UI decoration:
  every `/simulate` response carries it verbatim; the client renders it undismissable.
- Simulations are never cached as world data and never mixed into snapshots.
- Demo script and README both state simulations are LLM fiction for stress-testing
  assumptions — not forecasts. Misrepresenting them would be a disqualification-level
  own goal.

## Supply chain (v1, proportionate)
- `npm audit` on day 3; fix criticals only — no dependency churn near the deadline.
- Pin `groq-sdk`, `serpapi`, `react-force-graph-2d` versions in package.json.
