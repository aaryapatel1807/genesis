# KnowledgeGraph.md — Genesis Graph Model & Scoring

## Node model
See Database.md for fields. Node `type` drives visual encoding:
| Type | Color | Shape |
|---|---|---|
| company | teal `#2dd4bf` | circle |
| researcher | violet `#a78bfa` | circle |
| university | blue `#5aa9ff` | square |
| product | amber `#f5b942` | diamond |
| startup | green `#4ade80` | circle (small) |
| funder | pink `#f472b6` | square |
| patent | gray `#94a3b8` | triangle |
| event | white `#e8edf4` | star |
| technology | cyan `#22d3ee` | hexagon |
| paper | indigo `#818cf8` | diamond (small) |
| job | orange `#fb923c` | circle (small) |
| country | slate `#64748b` | square (large) |
| government | stone `#a8a29e` | square |
| law | rose `#fb7185` | triangle (small) |

## Layers (DNA §12 — core concept)
Layers are toggleable filters over node-type groups. Toggling dims non-members to 15%
opacity; layout is preserved so context is never lost.
| Layer | Member types |
|---|---|
| Companies | company, startup, funder |
| Research | researcher, university, paper, technology |
| News | event |
| Jobs | job |
| Funding | funder, startup |
| Products | product |
| Policy | government, law, country |

## Edge model
Relation → strength → glow: `strong` = green glow, `medium` = yellow, `weak` = red/dim.
Strength rule (deterministic): ≥3 corroborating sources → strong; 2 → medium; 1 → weak.

## Dedupe
- Key: lowercase name stripped of suffixes (`Inc`, `LLC`, `AI`, punctuation).
- "OpenAI", "Open AI", "openai.com" → one node `n_openai`, aliases recorded.
- Cross-snapshot stability: the same key must resolve across 2020–2026 snapshots
  or the time machine can't morph (this is why ids are `n_<slug>`, not random).

## Influence score (0–100, deterministic)
```
influence = round( 40 * degree_norm + 30 * source_norm + 20 * recency_norm + 10 * type_boost )
```
- `degree_norm`: node degree / max degree in world.
- `source_norm`: distinct evidence URLs / max in world.
- `recency_norm`: 1 if any source < 90 days old, decaying to 0 at 2 years.
- `type_boost`: company 1.0, researcher 0.8, product 0.9, university 0.7, … (tuned by hand).
No LLM in scoring — judges can be shown the formula.

## Reality Meter (per node)
- **Confidence %**: corroboration-based — appears in ≥3 queries AND ≥2 engines → 90+;
  single source → ≤40. Formula, not vibes.
- **Freshness**: newest evidence date → "Today" / "3d ago" / "2024".
- **Sources**: count of distinct URLs.

## Growth signal (Discovery Engine input, v1-lite)
`growth(node) = degree(2026) − degree(2024)` normalized. Top-5 positive deltas feed the
"emerging" highlight. Computed from snapshots, not from an LLM.
