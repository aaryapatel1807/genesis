# Planning.md — Genesis Agent Planning

## v1 stance: no planner
Genesis v1 has no planning agent, no task decomposition, no ReAct loop.
The "plan" for every operation is a fixed pipeline (see Agents.md):
```
search → extract → dedupe → merge → score → write
```
Fixed stages, fixed order, no LLM deciding what to do next. This is deliberate:
- **Credit safety**: a planner that decides to "search more" is how free tiers die.
- **Determinism**: the same inputs produce the same world — debuggable, demoable.
- **Scope**: planning agents solve open-ended tasks; world-building is a closed pipeline.

## Where planning-like behavior appears (bounded)
| Behavior | Where | Bound |
|---|---|---|
| Query selection for expansion | `/api/expand` route code | Template-based: `"{node}" + type-specific suffix`, max 2 queries |
| Snapshot query planning | `build-world.ts` | Hardcoded seed list per year (see SearchPipeline.md) |
| Cascade traversal | `/api/simulate` | 1 hop along existing edges, max 15 nodes |

All three are **code, not LLM decisions**. The LLM fills in structured content;
it never chooses the next action.

## v2 path
A bounded planner for "grow this region of the world": given a node cluster and a
credit budget, propose the query set, execute, stop at budget. Human approves the
plan before execution — planning as proposal, not autonomy.
