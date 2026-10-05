# Authentication.md — Genesis Auth Plan

## v1: No authentication
Genesis v1 is a public demo for hackathon judges. There are no user accounts, no saved
data per user, no personal information collected. **Deliberately out of scope** — auth
would consume day-3 hours better spent on the demo.

Consequences:
- No login, no sessions, no passwords anywhere in the codebase.
- The expansion session cap (10 fresh searches) is per-IP in-memory, not per-user.
  It's abuse-friction for a demo, not a security boundary (see Security.md).
- Anyone with the URL can generate/simulate — acceptable for a judged demo.

## v2 (only if the project continues past the hackathon)
- OAuth (Google) via Auth.js — only when we need saved worlds / shared trails.
- API keys per user for the simulation/expansion endpoints once SerpApi costs matter.
- Until then: no auth code, no auth dependencies, no user table.

## Rule
Do not add authentication to v1 "just in case". Every hour spent on auth is an hour
not spent on the demo that actually wins.
