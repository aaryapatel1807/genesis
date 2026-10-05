# 03_Features.md — Genesis Feature List

> Status key: ✅ v1 must-ship · 🔶 v1 if time · ❌ cut (vision only)

## ✅ F1 — World Generation
Type a topic (v1: fixed to "Artificial Intelligence"), watch its universe emerge.
Precomputed entity pipeline → cached world JSON → animated graph build-up.
*SerpApi: `google` + `google_news` + `google_scholar` + `google_jobs` seed queries. AI: entity/relation extraction via Groq.*

## ✅ F2 — Living Knowledge Universe
Force-directed 2D graph with glow styling. Every node expandable; every expansion
grafts new entities onto the world. Capped live search (~2 per expansion, ~10/session).
*SerpApi: targeted queries per expansion. AI: extraction + dedupe.*

## ✅ F3 — Time Machine
Slider: 2020 → 2022 → 2024 → 2026. The graph morphs between precomputed snapshots —
companies appear, products vanish, funding grows. History you can watch.
*SerpApi: date-restricted searches (`tbs`) per snapshot, precomputed once.*

## ✅ F4 — Future Simulator
"What if NVIDIA disappears?" The AI generates the cascade — affected nodes dim,
edges rewire — with an unmissable **SIMULATION — NOT FACTUAL** label.
*AI: Groq scenario generation over the world graph. No SerpApi (it's fiction, labeled).*

## ✅ F5 — Reality Meter
Every node shows: Confidence % (corroboration across sources), Freshness (newest source date),
Sources (count). Users always know how current and well-supported a node is.
*Deterministic scoring from evidence; no LLM.*

## ✅ F6 — Explain Connections
Click any edge → panel shows *why* these nodes connect: relation type, evidence snippets,
source links. Every connection backed by citations.
*Data from the entity pipeline's stored evidence.*

## ✅ F7 — Layer Filters (DNA core concept)
Toggle chips: Companies / Research / News / Jobs / Funding / Products.
Toggling dims non-member nodes to 15% opacity — layout preserved, context kept.
*Deterministic filter over node types; no search cost.*

## 🔶 F8 — Story Mode
"Tell me the story" — animated timeline of the domain (foundings, launches, breakthroughs).
*AI: narrative generation over timestamped nodes. P1 if day 3 has slack.*

## 🔶 F9 — Discovery Engine (v1-lite)
"Emerging" highlight: top-5 nodes by snapshot-over-snapshot growth.
*Deterministic from snapshots; no LLM.*

## 🔶 F10 — Serendipity (DNA §20 metric, made tangible)
"Surprise me" button — camera flies to a random emerging node with its story.
Success (per DNA): a first-time viewer discovers something they didn't know existed
within 3 minutes. This button is how we instrument it.

## ❌ Cut (vision only)
- F11 Autonomous expansion (credit suicide on free plan — see Vision § "On Continuous Evolution")
- F12 World comparison (AI vs Quantum side-by-side)
- F13 World replay (yesterday vs today animation)
- F14 Exploration trails (record/share journeys)
- F15 AI camera / deep zoom detail layers
- F16 Multi-topic / any-topic generation
