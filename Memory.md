# Memory.md — Genesis AI Memory Architecture

## v1 stance: stateless by design
Genesis v1 has **no conversational memory** — there is no chat, no user accounts,
no sessions worth remembering. Every LLM call is stateless: evidence in, JSON out.

## What "memory" means in Genesis
| Layer | Implementation | Purpose |
|---|---|---|
| World memory | `data/world.json` | The persistent knowledge — this IS the memory |
| Snapshot memory | `data/snapshots/{year}.json` | Temporal memory: what the world looked like |
| Expansion cache | `data/cache/expansions/` | Short-term: what live search already answered |
| Session memory | In-memory per browser session | Expanded nodes, simulation state — dies on refresh |

## What's deliberately NOT stored
- User scenarios beyond 100 chars (see Logging.md).
- Anything identifying the viewer (no auth in v1 — nothing to attach it to).

## v2 path
If accounts ever exist: per-user "worlds I've grown" (their expansions merged into a
personal world.json fork), exploration trails (see cut F14). Memory becomes
user-scoped, exportable, deletable — GDPR-shaped from day one.
