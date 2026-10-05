# Confidence.md — Genesis Confidence & the Reality Meter

## Principle
**Confidence is computed, never asserted.** The LLM is never asked "how sure are you" —
its self-reported confidence is uncalibrated theater. The Reality Meter is deterministic.

## Scoring (per node)
```
sources      = count(distinct source domains backing the node)
recency_days = now − newest source date
confidence   = min(0.95, 0.35 + 0.15 × min(sources, 4))
freshness    = recency_days ≤ 30 ? "fresh" : recency_days ≤ 180 ? "aging" : "stale"
```
- 1 source → 50% · 2 → 65% · 3 → 80% · 4+ → 95% (cap: never 100 — epistemic humility).
- Simulation nodes: no meter — they get the SIMULATION banner instead.

## Scoring (per edge)
- `strong`: ≥2 independent sources with verbatim evidence snippets.
- `medium`: 1 source, or 2 sources without verbatim snippets.
- `weak`: single passing mention — shown dashed, still clickable, evidence visible.

## Display (RealityMeter.tsx)
Compact: confidence bar + "Freshness: 3d ago · 12 sources". Clicking expands to the
source list with dates. Always visible in NodePanel — no hidden uncertainty.

## What confidence does NOT do
- Never hides low-confidence nodes (a weak edge honestly shown beats a hidden one).
- Never gates features ("only show confident nodes" would betray DNA §19: evidence first).
- Never comes from the LLM.

## DNA alignment (§18)
"Confidence should be visible." The meter is the product's honesty made glanceable.
