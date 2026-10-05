# Reasoning.md — How Genesis "Reasons"

## Honest framing
Genesis does not run a reasoning engine. It runs **three narrow inference patterns** —
each bounded, each labeled, none presented as truth:

### 1. Extraction (build + expand)
Search results → entities + relations. The "reasoning" is pattern completion over
provided text, constrained by the prompt's verbatim-name rule. No conclusions drawn.

### 2. Deduplication (deterministic, not LLM)
Normalized-name matching + type check. Deliberately NOT left to the LLM —
fuzzy matching by hand-written rules is cheaper, testable, and doesn't hallucinate merges.

### 3. Scenario cascade (simulator)
World graph + hypothetical → affected nodes via edge traversal. The LLM narrates
*plausible* 1-step effects along existing edges only. Output is labeled
**SIMULATION — NOT FACTUAL** at every render (see SimulationEngine.md).

## What's banned in v1
- Chain-of-thought shown to users (internal reasoning stays internal).
- Multi-hop autonomous inference ("A funds B, B employs C, therefore A controls C" —
  the graph *shows* the path; the system never asserts the conclusion).
- Confidence expressed by the LLM (that's the Reality Meter — deterministic, see Confidence.md).

## DNA alignment (§13)
"AI accelerates understanding; humans decide." Genesis reasons *just enough* to
organize evidence — the deciding is always the user's.
