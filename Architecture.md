# Architecture.md — Genesis System Architecture

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript (strict) |
| Visualization | `react-force-graph-2d` (glow-styled; 2D chosen over 3D for reliability) |
| LLM | Groq free tier (`groq-sdk`), temperature 0.2, JSON mode |
| Search | SerpApi (`serpapi` npm): engines `google`, `google_news`, `google_scholar`, `google_jobs` |
| Storage | JSON files in `data/` (gitignored). No DB server in v1 |
| Styling | Tailwind CSS |

## Observability
- `scripts/build-world.ts` logs structured JSON lines per stage (query → result count →
  extracted counts → dedupe stats) to `data/build-log.jsonl`.
- API routes log `{ route, ms, serpapiFresh }` to stdout. Raw user text is never logged
  beyond 100 chars. (DNA technical philosophy: "Observable".)

## System diagram
```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Browser   │────▶│  Next.js App     │────▶│  data/*.json │
│ force-graph │◀────│  API routes      │◀────│  (world,     │
│ 2D universe │     │  lib/pipeline/*  │     │   snapshots, │
└─────────────┘     └────────┬─────────┘     │   cache)     │
                             │               └──────────────┘
                    ┌────────▼─────────┐     ┌──────────────┐
                    │  Groq (extract,  │     │  SerpApi     │
                    │  simulate)       │     │  google,     │
                    └──────────────────┘     │  google_news │
                                             └──────────────┘
```

## Folder structure
```
├── app/
│   ├── page.tsx                    # homepage: topic input → Generate World
│   ├── world/page.tsx              # universe view (graph + panels + time slider + simulator)
│   └── api/
│       ├── world/route.ts          # GET: serve cached world JSON
│       ├── world/expand/route.ts   # POST: expand a node (capped live search)
│       ├── world/snapshot/[year]/route.ts  # GET: historical snapshot
│       └── simulate/route.ts       # POST: future scenario simulation
├── components/
│   ├── UniverseGraph.tsx           # force-graph wrapper, glow theme
│   ├── NodePanel.tsx               # description + Reality Meter
│   ├── EdgePanel.tsx               # "why connected" evidence
│   ├── TimeSlider.tsx              # 2020/2022/2024/2026
│   ├── SimulatorPanel.tsx          # scenario input + cascade list + SIMULATION banner
│   └── RealityMeter.tsx
├── lib/
│   ├── serpapi.ts                  # ONLY SerpApi access: cache + 1/sec throttle + ledger
│   ├── world.ts                    # world JSON load/save, node/edge helpers
│   ├── scoring.ts                  # influence score, reality meter math
│   └── pipeline/
│       ├── seed.ts                 # seed query definitions per category
│       ├── extract.ts              # Groq entity/relation extraction
│       ├── dedupe.ts               # normalized-name merge
│       └── prompts.ts              # all LLM prompts
├── data/                           # gitignored: world-ai.json, snapshots/, cache/, ledger
└── scripts/
    └── build-world.ts              # one-shot: queries → extraction → world JSON (run manually)
```

## Key design decisions
1. **Precompute, don't live-generate.** `scripts/build-world.ts` runs once (human-supervised);
   the app serves the cached world. The demo never depends on live-search luck or credit balance.
2. **All SerpApi traffic through `lib/serpapi.ts`.** Cache key = sha256(engine+query+params).
   Repeats within ~1h are free; the ledger counts only fresh calls.
3. **No LLM in the render path.** The world JSON is fully materialized; Groq is used at
   build time (extraction) and on demand (simulator, expansion extraction). The graph renders
   from JSON — fast, deterministic, demo-safe.
4. **2D over 3D.** `react-force-graph-2d` with additive glow styling delivers the "hologram"
   feel without WebGL fragility across judges' machines.
