# Genesis Phase 7 — Integration Pass

Verified 2026-10-05 ~08:30 IST against repo commit `54aa122` (+ Phase 7 fixes below).
Method: `npx tsc --noEmit` + `npm run build` + dev server (`npm run dev`) with curl
smoke tests of every API route. No live browser available; UI interactions were
verified by code inspection of the wired handlers plus build/type checks.

## Checklist

| # | Flow | Check performed | Result |
|---|------|-----------------|--------|
| 1 | Landing `/` → Generate World → `/world` | `curl /` → 200, contains "Generate World" button routing to `/world`; `curl /world` → 200 | PASS |
| 1 | `/world` loads world.json via `GET /api/world` | `curl /api/world` → 200, `{meta,nodes:74,edges:120}`; page fetches on mount | PASS |
| 2 | LayerBar toggles dim nodes by layer (no removal) | Code: `activeLayers` → `dimmed` id set → `UniverseGraph` paints `globalAlpha 0.15`, nodes stay mounted | PASS |
| 3 | TimeSlider swaps snapshots | `curl /api/world/snapshot/2020|2022|2024|2026` → 200 (2020: 27 nodes, `snapshot_year` set); `page.tsx` fetches `/api/world/snapshot/${y}` for y≠2026 | PASS |
| 3 | Invalid snapshot year → 404 | `curl /api/world/snapshot/2030` → 404; `curl .../abc` → 404 | PASS |
| 4 | Node click → NodePanel with RealityMeter + sources | `onNodeClick` → `setSelectedNodeId`; panel renders `RealityMeter` (confidence/freshness/sources) + Sources list from edge evidence | PASS |
| 4 | Expand, no API keys (graceful degradation) | `POST /api/world/expand {nodeId:n_openai}` → 200 `{addedNodes:[],addedEdges:[],note:"Live expansion unavailable — showing cached universe.",cached:true}` — no crash, no invented nodes | PASS |
| 4 | Expand unknown nodeId → 404 | `POST {nodeId:"n_nope"}` → 404 `{error:"unknown node"}`; malformed body `{}` → 404 | PASS |
| 4 | Budget exhausted → 429 + `cached:true` | In-process route test: session pre-seeded with 10 expansions → 429 `{error:"expansion budget exhausted",cached:true,sessionId}` | PASS |
| 5 | Edge click → EdgePanel with relation + evidence | `onEdgeClick` → `setSelectedEdgeId`; panel shows `{source} <relation> {target}`, strength badge, evidence snippets + source links | PASS |
| 6 | Simulator → `POST /api/simulate` | No-key path → 200 `{scenario,label,affected:[],cascades:[],note,isSimulation:true}`; empty scenario → 400; bad JSON → 400 | PASS |
| 6 | Response always carries SIMULATION label | `label: "SIMULATION — AI-generated scenario, not factual prediction."` present in degraded and live code paths | PASS |
| 6 | SimulatorPanel undismissable banner | `role="alert"` banner renders while `simulating \|\| items.length>0`; only the Reset button clears it (no X) | PASS |
| 6 | Unknown LLM node ids dropped server-side | `runSimulation` filters `affected`/`cascades` against world node ids (`!ids.has(nodeId) → continue`) | PASS |
| 7 | SerendipityButton → flyTo random emerging node + opens panel | `handleSurprise`: picks from `first_seen >= '2022'` (32 candidates), `setSelectedNodeId(pick.id)` + `graphRef.flyTo(pick.id)` | PASS |
| — | `npx tsc --noEmit` | clean | PASS |
| — | `npm run build` | green (all routes: `/`, `/world`, `/api/world`, `/api/world/expand`, `/api/simulate`, `/api/world/snapshot/[year]`) | PASS |
| — | No emojis in UI | grep over `components/*.tsx`, `app/page.tsx`, `app/world/page.tsx` — none | PASS |
| — | No secrets in repo | no API keys committed (`.env` gitignored; keys read from env only) | PASS |

## Fixed

1. **Cascade node-id contract drift (runtime bug):** `lib/types.ts` `SimCascade` used `node`, but `lib/agents/simulation.ts` and API.md specify `nodeId`. With a Groq key set, `SimulatorPanel` would have rendered undefined node ids/names. Fixed `SimCascade.nodeId` in `lib/types.ts` and the two `c.node` references in `app/world/page.tsx`.
2. **`/api/simulate` bypassed the DB adapter:** it read `data/world.json` with `readFile` directly, ignoring the Phase 6 `getDb()` adapter (and Postgres mode). Switched to `getDb().getWorld()`.
3. **Simulation runs were never audit-logged:** `DbAdapter.logSimulation` existed but no route called it. `/api/simulate` now logs both the no-key degraded run and the live run (best-effort, never throws).

## Deferred

- Live-path e2e for `/api/world/expand` (fresh SerpApi searches) and `/api/simulate` (Groq): needs real keys, which we must not burn/store — degraded-path coverage + unit-level filter checks stand in.
- API.md rate limiting (`/expand`, `/simulate` 20 req/min) is documented but not implemented in routes — out of scope for this integration pass; flagging for Phase 9 (Optimization).
