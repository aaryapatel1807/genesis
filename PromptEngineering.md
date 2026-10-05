# PromptEngineering.md — Genesis Prompt Design

## Principles
- **Structured output only.** Every LLM call requests JSON with a fixed schema; free prose is a bug.
- **Grounded, not clever.** Prompts include the source text to extract from — the model reasons
  over provided evidence, never from memory.
- **Short system prompts.** One paragraph of role + the schema. Long preambles waste tokens
  on the free tier.

## The extraction prompt (used by build-world.ts and /api/expand)
```
You are an entity extractor. Given search results about the AI ecosystem,
return ONLY valid JSON:
{ "entities": [{ "name": "...", "type": "<one of the 14 types>", "description": "<=2 sentences>" }],
  "relations": [{ "source": "...", "target": "...", "relation": "<founded_by|funds|acquired|partners_with|competes_with|employs|published|works_at|launched|regulates|located_in|invested_in>", "evidence": "<verbatim snippet>" }] }
Rules: names must appear verbatim in the input. No invented entities. Max 12 entities.
Input:
<<<SEARCH RESULTS>>>
```

## The simulator prompt
```
You are a scenario engine, not a predictor. Given this world graph (nodes+edges as JSON)
and a hypothetical scenario, list affected nodes and 1-step cascade effects.
Return ONLY JSON: { "cascades": [{ "node": "...", "effect": "...", "severity": "high|medium|low" }] }
Rules: effects must follow existing edges. Never state outcomes as facts.
Scenario: <<<USER SCENARIO>>>
```

## Anti-patterns (banned)
- "You are a helpful assistant" openers with no schema.
- Asking the model to *judge* truth (that's the Reality Meter's job — deterministic).
- Multi-turn conversations (every call is stateless; see Memory.md).
