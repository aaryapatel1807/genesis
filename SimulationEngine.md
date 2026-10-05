# SimulationEngine.md — Genesis Future Simulator

## Purpose
The killer feature: "what if X disappears?" — an AI-generated cascade over the world graph,
**explicitly labeled as simulation, never presented as prediction.**

## Input / output
- Input: `{ scenario: string }` — max 200 chars, HTML-stripped, e.g. "NVIDIA disappears".
- Output: `{ affected: [nodeIds], cascades: [{ nodeId, effect, severity }], label }`
- `label` (mandatory, verbatim): **"SIMULATION — AI-generated scenario, not factual prediction."**

## How it works
1. **Context packing** — the world is too big for one prompt. Send a compact summary:
   node names + types (all), edges as `A --relation--> B` (top 150 by strength).
2. **Generation** — Groq, temperature 0.5, prompt: "Given this ecosystem graph and the
   scenario, list directly and indirectly affected node ids and one-line effects.
   Respond in JSON only. Do not invent entities."
3. **Validation (the important part)** — server-side:
   - Drop any `nodeId` not present in the world (anti-hallucination filter).
   - Cap cascades at 12 entries.
   - Severity ∈ {`critical`, `major`, `minor`} only; anything else → `minor`.
4. **Render** — client dims unaffected nodes, pulses affected ones, lists cascades;
   the SIMULATION banner renders unconditionally and can't be dismissed without reset.

## Example
Scenario: "NVIDIA disappears"
→ affected: `n_nvidia` (removed), `n_openai` (critical: loses primary GPU supply),
`n_microsoft` (major: Azure AI capacity constrained), `n_tsmc` (major: loses top customer),
`n_amd` (minor: opportunity — demand shifts). Each with one plain-English line.

## Honesty rules (non-negotiable)
- The banner is part of the response contract, not a UI nicety.
- The demo script says "simulation" out loud before showing it.
- README documents that simulations are LLM fiction grounded in graph structure —
  useful for stress-testing assumptions, useless as forecasts.
- Never cache a simulation as if it were world data; simulations are ephemeral.
