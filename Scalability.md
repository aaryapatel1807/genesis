# Scalability.md — Genesis Scaling Story

## Honest v1 position
Genesis v1 does not need to scale — it's a hackathon demo serving judges, not users.
This file exists so the architecture doesn't *prevent* scaling, and so the README
can answer "how would this scale?" credibly.

## What scales for free
- **Reads**: `world.json` is static — Vercel's CDN serves it globally at zero cost.
  10 or 10,000 viewers cost the same (until bandwidth limits, which we won't hit).
- **Snapshots**: one JSON per year, lazy-loaded — same CDN story.

## What doesn't (yet)
- **Live expansion**: every expansion burns SerpApi credits + Groq tokens per user.
  v1 caps: ~2 searches/expansion, ~10 expansions/session, session counter in UI.
- **Simulator**: Groq free-tier rate limits — per-session cooldown (1 simulation / 30s).

## The v2 path (documented, not built)
1. Move world storage to Postgres + pgvector (semantic search over entities).
2. Background worker (BullMQ/Trigger.dev) rebuilds worlds on a schedule —
   credits spent once per rebuild, served to all users from cache.
3. Per-user expansion quotas in Redis; SerpApi cache shared across users
   (same query within the freshness window = one credit).
4. Read replicas / edge caching for the graph API.

## The one-liner for judges
"Reads scale infinitely on the CDN today; writes are credit-capped by design —
the architecture already separates the two, so v2 is an ops change, not a rewrite."
