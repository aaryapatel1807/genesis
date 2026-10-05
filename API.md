# API.md — Genesis REST API

Base: same origin (Next.js API routes). All responses JSON. Errors: `{ error, code }`.

## `GET /api/world`
Serve the precomputed universe.
- Response: `200 { meta, nodes, edges }` (the world file).
- Cost: 0 SerpApi calls. Cache headers: `s-maxage=3600` (static in practice).

## `POST /api/world/expand`
Expand a node with live search.
- Body: `{ "nodeId": "n_openai" }`
- Response: `200 { addedNodes: Node[], addedEdges: Edge[], searchesUsed: 2 }`
- Errors:
  - `404 { error: "unknown node" }`
  - `429 { error: "expansion budget exhausted", cached: true }` — session cap (10 fresh searches) hit; client switches to cached-only mode.
  - `200 { addedNodes: [], addedEdges: [], note: "no further entities found" }` — honest empty, never invented.

## `GET /api/world/snapshot/[year]`
- Params: `year ∈ {2020, 2022, 2024, 2026}`.
- Response: `200 { meta: { snapshot_year }, nodes, edges }`.
- `404` for any other year.

## `POST /api/simulate`
Run a what-if scenario.
- Body: `{ "scenario": "NVIDIA disappears" }` (max 200 chars, sanitized).
- Response:
```json
{
  "scenario": "NVIDIA disappears",
  "label": "SIMULATION — AI-generated scenario, not factual prediction.",
  "affected": ["n_nvidia", "n_openai", "n_tsmc"],
  "cascades": [
    { "nodeId": "n_openai", "effect": "Loses primary GPU supply; training costs spike.", "severity": "critical" }
  ]
}
```
- The `label` field is mandatory in every response; the client renders it as an undismissable banner.
- Unknown node ids in the LLM output are dropped server-side (anti-hallucination filter).

## Rate limiting (see Security.md)
- `/expand` and `/simulate`: 20 req/min per IP (in-memory).
- All routes: input length caps; scenario text stripped of HTML.

## Versioning
v1 has no version prefix (single hackathon build). If v2 ships, prefix `/api/v2/`.
