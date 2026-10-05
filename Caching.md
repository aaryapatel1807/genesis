# Caching.md — Genesis Caching Strategy

## The golden rule
**SerpApi credits are the scarcest resource. Cache everything; re-search almost never.**

## Layers
| Layer | What | TTL | Where |
|---|---|---|---|
| World | `world.json` (precomputed) | Immutable per build | Vercel CDN (static asset) |
| Snapshots | `snapshots/{year}.json` | Immutable per build | Vercel CDN, lazy-loaded |
| Expansion results | Query → extracted entities | 7 days | `data/cache/expansions/*.json` (server fs) |
| SerpApi raw | SerpApi's own cache | ~1h (their policy) | SerpApi side — repeat queries within the hour are free |
| Simulator | Scenario hash → cascade | Session only | In-memory (it's labeled fiction; no need to persist) |

## Expansion cache design
- Key: `sha256(normalized query + engine)`.
- Hit: return cached entities, mark `serpapiFresh: false`, spend 0 credits.
- Miss: live call, store result, append to credit log.
- Eviction: LRU by file mtime, cap 200 entries (~small JSON each).

## Cache headers
- `world.json`, snapshots: `Cache-Control: public, max-age=31536000, immutable`
  (content-hashed filenames on rebuild).
- API routes: `no-store` — but the *server* checks its expansion cache first.

## Demo implication
The recorded demo should run the expansion path once live (judges love "live"),
then rely on cache for every rehearsal. Rehearsals are free; only genuinely new
queries cost credits.
