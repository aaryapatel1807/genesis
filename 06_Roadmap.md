# 06_Roadmap.md — Genesis Roadmap

## v1 — Hackathon build (7–9 Oct 2026)
**Goal:** a shippable, demoable "AI Ecosystem Genesis". Submit 9 Oct if possible.

### Day 1 — The entity pipeline (7 Oct)
- SerpApi seed queries (`google` ×6, `google_news` ×2) → raw results.
- Groq extraction: entities + relationships as structured JSON.
- Dedupe, merge, deterministic influence scoring.
- Output: `data/world-ai.json` — 50+ nodes, hand-verified. **No UI yet.**
- Milestone: open the JSON and read a sensible universe.

### Day 2 — The living universe (8 Oct)
- 2D force-graph UI with glow styling; animated world build-up.
- Click node → side panel (description, Reality Meter) → Expand (capped live search).
- Click edge → "why connected" evidence panel.
- Milestone: explorable universe, no dead ends, honest empty states.

### Day 3 — Time, simulation, submit (9 Oct)
- Morning: time machine (4 precomputed snapshots via `tbs` date-restricted search).
- Midday: future simulator (Groq scenario + hard SIMULATION labeling) + polish.
- Afternoon: README, demo video (<3 min), final `npm run build`.
- Evening: submit repo + video. **10 Oct is buffer, not plan A.**

### Cut order (if behind)
1. Story mode → 2. Discovery engine → 3. Future simulator polish (keep basic version)
4. Time machine (keep 2 snapshots instead of 4) → 5. Live expansion (ship precomputed world only)
Never cut: world generation, graph UI, reality meter, edge evidence, demo video.

## v2 — Post-hackathon vision (only if v1 lands well)
- Any-topic generation (the real "ask anything").
- Story mode + discovery engine as first-class features.
- World comparison, replay, exploration trails.
- Browser extension: generate a world for the page you're reading.

## Submission checklist
- [ ] Public repo (`.env` gitignored, no secrets)
- [ ] Demo video < 3 min (script: hook → generate → expand → time travel → simulate → tagline)
- [ ] README with setup, architecture, credit budget
- [ ] Submitted before 10 Oct 2026, 23:59 IST
