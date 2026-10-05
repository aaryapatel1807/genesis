# 01_PRD.md — Genesis Product Requirements Document

## Product
**Genesis** — *The Living World Model*
Tagline: **"Ask anything. Watch a world emerge."**

## Problem
Knowledge exploration is broken. Search engines return flat lists. Chatbots return walls of text.
Knowledge graphs are static and dead. None of them let you *see* how a field fits together,
how it evolved, or what happens if a key piece disappears.

## Solution
An AI world generator. You type a topic; the system builds a living, explorable knowledge
universe from live search data — entities as glowing nodes, relationships as evidence-backed
edges — that you can expand, time-travel through, and run what-if simulations on.

## v1 Scope: AI Ecosystem Genesis
One domain, deep. The v1 world models the artificial intelligence ecosystem:
companies, researchers, universities, products, startups, funding, patents, news, jobs.
(Any-topic generation is vision, not v1.)

## Target users
1. **Hackathon judges** — the demo must land in under 3 minutes.
2. **Curious learners** — students exploring a field visually instead of reading Wikipedia.
3. **Analysts & founders** — anyone who wants the shape of an ecosystem at a glance.

## Core features (v1 — must ship)
1. **World generation** — topic in → living universe out (precomputed, cached).
2. **Living knowledge universe** — force-directed graph; click any node to expand (capped live search).
3. **Time machine** — slider across 4 snapshots (2020 / 2022 /  2024 / 2026); watch the ecosystem evolve.
4. **Future simulator** — "what if X disappears" scenario simulation, hard-labeled as AI-generated fiction.
5. **Reality meter** — per-node confidence / freshness / source count.
6. **Explain connections** — click any edge → why these nodes connect, with cited evidence.

## Out of scope (v1)
Autonomous expansion, world comparison, world replay, discovery engine, story mode,
multi-topic generation, user accounts, mobile app. (Vision doc only.)

## Constraints
- **SerpApi free plan**: ~100–250 searches/month. World precomputed once (~30 searches),
  cached as JSON. Live expansion capped (~10 searches/session). Repeat queries served from cache (free).
- **Build window**: 3 days (7–9 Oct 2026). Submit 9 Oct if possible.
- **Stack**: Next.js 14, Groq (free tier), SerpApi, 2D force-graph. No DB server (JSON files).

## Success criteria
- "Artificial Intelligence" generates a 50+ node universe in the demo without live-search luck.
- Full demo flow (generate → expand → time travel → simulate) runs < 3 minutes on video.
- Every node/edge traceable to cited sources (no uncited LLM confabulation presented as fact).
- **Discovery metric (DNA §20):** a first-time viewer discovers something they didn't know
  existed within 3 minutes of free exploration — instrumented via the "Surprise me" affordance.
- `npm run build` green; public repo; submitted before 10 Oct 2026, 23:59 IST.

## Principles
- AI accelerates understanding; humans decide (DNA §13). Genesis never tells the user
  what to conclude — it shows the world and the evidence.

## Submission checklist
- [ ] Public GitHub repo with README (no secrets — `.env` gitignored)
- [ ] Demo video < 3 minutes
- [ ] Meaningful SerpApi use visible (multi-endpoint: `google`, `google_news`; date-restricted snapshots)
- [ ] 1,000 participation credits claimed
