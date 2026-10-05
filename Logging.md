# Logging.md — Genesis Logging

## Format: JSON lines to stdout
Every log is one JSON object per line — parseable by Vercel's log viewer,
`jq`-friendly locally. No pretty-printing in production code paths.

## What gets logged
| Event | Fields |
|---|---|
| API request | `{ route, ms, status, serpapiFresh }` |
| World build stage | `{ stage, query, results, extracted, deduped }` → `data/build-log.jsonl` |
| SerpApi call | `{ engine, queryHash, fresh, latencyMs }` — query text hashed, not raw |
| Expansion | `{ nodeId, newNodes, newEdges, searchesUsed }` |
| Simulation | `{ scenarioHash, cascades, ms }` |
| Error | `{ route, error: message, stack?: dev-only }` |

## What NEVER gets logged
- API keys, tokens, secrets (obviously).
- Raw user scenario text beyond 100 chars (it's user input; treat it as PII-adjacent).
- Full SerpApi responses (bloat; the extraction counts suffice).

## Levels
`debug` (local only) · `info` (default) · `warn` (budget < 20%, 429s) · `error`.
Set via `LOG_LEVEL` env; default `info` in production.

## Retention
Vercel keeps runtime logs per its free-tier window — enough for demo week.
`data/build-log.jsonl` is committed alongside `world.json` as build provenance:
proof the world was generated, not hand-drawn.
