# Database.md — Genesis Data Model

> v1 uses **JSON files** in `data/` (gitignored). Schemas below are the contract and map 1:1
> to TypeScript types in `lib/world.ts`. No database server.

## File layout
```
data/
├── world-ai.json               # the precomputed universe (nodes + edges + meta)
├── snapshots/
│   ├── 2020.json · 2022.json · 2024.json · 2026.json
├── cache/
│   └── <sha256(engine|query|params)>.json   # SerpApi response cache
└── credit-ledger.json          # { planLimit, used, log[] }
```

## Node
| Field | Type | Notes |
|---|---|---|
| `id` | string | `n_<slug>` — deterministic from normalized name |
| `name` | string | "OpenAI" |
| `type` | enum | `company` `researcher` `university` `product` `startup` `funder` `patent` `event` `technology` `paper` `job` `country` `government` `law` |
| `description` | string | 1–2 sentences, from extraction |
| `influence` | int 0–100 | Deterministic: see KnowledgeGraph.md |
| `reality` | object | `{ confidence: 0–100, freshness: "2026-09-28", sources: 12 }` |
| `first_seen` | string | snapshot year the node appeared in (`"2020"`…) — powers the time machine |

## Edge
| Field | Type | Notes |
|---|---|---|
| `id` | string | `e_<src>_<dst>_<relation>` |
| `source` / `target` | string | node ids |
| `relation` | enum | `investment` `partnership` `supplies` `employs` `researches` `acquired` `competes` `powers` |
| `strength` | enum | `strong` `medium` `weak` → glow intensity (green/yellow/red) |
| `evidence` | array | `[{ snippet, url, engine, date }]` — every edge cites sources |

## World file
```json
{
  "meta": { "topic": "Artificial Intelligence", "built_at": "2026-10-07T…Z",
            "node_count": 64, "edge_count": 128, "source_count": 41 },
  "nodes": [ ... ],
  "edges": [ ... ]
}
```
Snapshots share the schema with `meta.snapshot_year`.

## Credit ledger
```json
{ "planLimit": 250, "used": 31,
  "log": [{ "at": "…", "engine": "google", "query_hash": "abc123", "cached": false }] }
```

## Integrity rules
- Every edge's `source`/`target` must resolve to a node id.
- Every edge carries ≥1 evidence item with a URL.
- Node ids are stable across snapshots (dedupe key) so the time machine can morph.
- `data/` is gitignored; a `data/.gitkeep`-style `data/README.md` documents regeneration via `scripts/build-world.ts`.
