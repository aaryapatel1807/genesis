# Backend.md — Genesis Server Logic

All server logic lives in Next.js API routes + `lib/`. No separate backend process.

## Routes
| Method & path | Purpose | SerpApi cost |
|---|---|---|
| `GET /api/world` | Serve `data/world-ai.json` (the precomputed universe) | 0 |
| `POST /api/world/expand` `{ nodeId }` | Expand a node: 1–2 targeted searches → extract → graft new nodes/edges | ≤2 |
| `GET /api/world/snapshot/[year]` | Serve precomputed snapshot (`2020`/`2022`/`2024`/`2026`) | 0 |
| `POST /api/simulate` `{ scenario }` | Groq scenario simulation over the world graph | 0 (LLM only) |

## Pipeline orchestration (`scripts/build-world.ts`, run manually — not on request)
```
for each seed query in lib/pipeline/seed.ts:
    results = serpapi.search(engine, q, num=10)      # cached, throttled 1/sec
    { entities, relations } = groq.extract(results)  # JSON mode, temp 0.2
    accumulate
world = dedupe(entities, relations)
world = score(world)          # influence + reality meter, deterministic
write data/world-ai.json
```
Snapshots repeat the same flow with `tbs` date ranges (see SearchPipeline.md).

## Expansion flow (`POST /api/world/expand`)
```
node = world.get(nodeId)
queries = [`"${node.name}" partnerships`, `"${node.name}" news`]
for q in queries (max 2):
    results = serpapi.search(...)          # hard cap enforced in lib/serpapi.ts
    newEntities = groq.extract(results, context=node)
graft = dedupeAgainst(world, newEntities)
world.add(graft); persist
return { addedNodes, addedEdges }
```
Session cap: **10 fresh searches per session** (tracked in-memory + ledger). Over cap →
`429 { error: "expansion budget exhausted", cached: true }` and the UI shows cached-only mode.

## Simulator flow (`POST /api/simulate`)
```
{ scenario } → groq.simulate(scenario, worldSummary)  # JSON: affectedNodeIds[], cascades[]
→ validate node IDs against world (drop hallucinations)
→ return { affected, cascades, label: "SIMULATION — AI-generated scenario, not factual" }
```
The client animates dimming/highlighting; the banner is rendered by `SimulatorPanel`
unconditionally — it cannot be dismissed without resetting the simulation.

## Failure modes (all handled, never crash the demo)
- SerpApi down / credits out → serve cache; expansion returns cached-only flag.
- Groq rate-limited → deterministic fallbacks (keyword extraction; rule-based cascade).
- Empty extraction → honest "no further entities found", never invented nodes.
