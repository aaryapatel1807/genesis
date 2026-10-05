# Queues.md — Genesis Background Jobs

## v1 stance: no queue system
Genesis v1 has no background workers — and that's a deliberate design decision,
not a gap. Rationale:
- World builds run **manually** (`npm run build:world`) before deploy — a script, not a job.
- Expansion is **synchronous** (< 4s) — no need to queue what finishes before the user blinks.
- No users, no auth, no notifications — nothing to process asynchronously.

## What "queues" means in v1 (the honest version)
| Need | v1 solution |
|---|---|
| World rebuild | Manual script + Dockerfile (see Docker.md) |
| Expansion backpressure | Session cap (~10) + per-call cap (~2 searches) — enforced in the API route, not a queue |
| Simulator cooldown | 1 per 30s per session — in-memory timestamp |

## The v2 path (documented, not built)
When continuous evolution (DNA Principle 5) gets its mechanism:
- **World refresh worker**: scheduled job (cron / Trigger.dev) re-runs the entity pipeline
  weekly; diffs the new world against the old; commits the updated `world.json`.
- **Expansion queue**: if multi-user ever happens, expansions go through a queue
  (BullMQ + Redis) with per-user quotas and shared SerpApi-result caching —
  one credit serves every user asking the same question.
- **Notification fan-out**: "your world grew" digests — needs users first.

## Judge one-liner
"No queues in v1 because there's nothing to queue — the one background task
(world rebuilds) is a manual script by design, keeping every SerpApi credit deliberate."
