# Agents.md — Genesis AI Agents

> "Agents" here = LLM-powered pipeline stages with narrow jobs, structured outputs, and
> deterministic fallbacks. No autonomous loops in v1 — the pipeline is orchestrated, not agentic.

## A1 — Extractor
- **Job:** read SerpApi result snippets → emit entities + relationships as JSON.
- **Input:** up to 10 results `{ title, snippet, link, date }` + topic context.
- **Output:** `{ entities: [{ name, type, description }], relations: [{ source, target, relation, evidence_snippet }] }`
  - `type` ∈ `company, researcher, university, product, startup, funder, patent, event, technology, paper, job, country, government, law`
- **Model:** Groq, JSON mode, temperature 0.2. Prompt in `lib/pipeline/prompts.ts`.
- **Fallback:** keyword extraction (capitalized noun phrases → `company`/`unknown` type, no relations). Never empty-crashes.

## A2 — Relation Verifier (deterministic, not LLM)
- **Job:** keep the extractor honest.
- **Rules:** drop relations whose source/target don't resolve to extracted entities;
  drop duplicates; require ≥1 evidence snippet per relation; cap 3 relations per entity pair.
- This is what stops the "pretty confabulation" failure mode.

## A3 — Simulator
- **Job:** given a scenario + world summary (node names/types/edges, no full JSON),
  output `{ affected: [nodeIds], cascades: [{ nodeId, effect, severity }] }`.
- **Model:** Groq, temperature 0.5 (creative but grounded), max 300 tokens.
- **Guardrails:** server drops any nodeId not in the world; response always carries the
  SIMULATION label; scenario input sanitized (200 chars, no HTML).

## A4 — Narrator (time machine captions)
- **Job:** one-line era caption per snapshot ("2022 — the generative boom begins").
- **Model:** Groq, or hand-written captions in v1 (4 strings — simpler and demo-safe).
- **v1 choice:** hand-written. Zero LLM risk on the demo's critical path.

## Prompt discipline
- All prompts live in `lib/pipeline/prompts.ts`, versioned with comments.
- Every prompt includes: role, exact JSON schema, 1 few-shot example, "if unsure, omit" instruction.
- No prompt is longer than needed — snippets are the context, not the web.

## What we don't do in v1
No planner agent, no multi-hop autonomous loops, no self-critique chains.
The pipeline is: search → extract → verify → score → render. Boring, reliable, demo-safe.
