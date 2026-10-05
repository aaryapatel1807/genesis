# Tools.md — Genesis Tool Inventory

## v1: the LLM has no tools
No function calling, no tool use, no browsing by the model. The LLM is a pure
text→JSON function. All "tools" are **server-side code** the pipeline calls directly:

| Tool | What it does | Called by |
|---|---|---|
| SerpApi (`google`, `google_news`, `google_scholar`, `google_jobs`) | Live search | `build-world.ts`, `/api/expand` |
| Groq (`llama-3.3-70b-versatile`) | Extraction, simulation | `build-world.ts`, `/api/expand`, `/api/simulate` |
| Dedupe matcher | Normalized-name + type merge | `build-world.ts`, `/api/expand` |
| Reality scorer | Confidence/freshness/sources | `build-world.ts`, `/api/expand` |
| Expansion cache | Query-hash → entities (7d) | `/api/expand` |

## Why no LLM tool use in v1
- **Latency**: each tool round-trip adds seconds; expansion must finish < 4s.
- **Cost**: agentic loops are credit-unpredictable — the opposite of the capped budget.
- **Reliability**: a demo that depends on the model choosing correctly is a demo that fails live.

## v2 path
If a planner ever arrives (see Planning.md), its tools would be exactly the five above —
exposed as functions with hard per-call credit accounting. The toolset doesn't grow;
the *caller* gets smarter, inside a budget.
