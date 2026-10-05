# Evaluation.md — Genesis Quality Evaluation

## What "good" means for a generated world
| Check | Method | Bar |
|---|---|---|
| No hallucinated entities | Sample 20 nodes; verify each name appears in its cited sources | 100% |
| No hallucinated relations | Sample 20 edges; verify evidence snippet supports the relation | ≥ 90% |
| Dedupe correctness | Spot-check merged entities (no false merges of distinct orgs) | ≥ 95% |
| World coherence | All edges reference existing node ids (no dangling refs) | 100% (script-checked) |
| Simulator honesty | Banner present in every simulation render; no factual phrasing | 100% |
| Demo reliability | Full flow (generate → expand → time travel → simulate) on video | 1 clean take |

## Automated checks (`npm run eval:world`)
Script over `data/world.json`:
1. Every edge's `source`/`target` resolves to a node id.
2. Every node has ≥1 source; every edge has ≥1 evidence snippet.
3. No duplicate normalized names within a type.
4. Descriptions ≤ 2 sentences; no empty strings.
Fails the build on violation — evaluated worlds can't ship broken.

## Human eval (pre-demo, ~30 min)
- Builder reads 20 random nodes + edges against their sources. Fixes go into
  `data/world.json` directly (it's a curated artifact, not raw output).
- One full demo rehearsal timed at < 3 minutes.

## What we don't evaluate in v1
- LLM output quality benchmarks (no golden dataset; spot-checks suffice).
- A/B tests, user studies (no users yet — the discovery metric in the PRD is
  measured informally during judging demos).
