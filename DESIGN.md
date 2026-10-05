# DESIGN.md — Genesis UI Style Guide

## Direction: "Cinematic Observatory"
Dark, immersive, scientific. The universe *is* the interface — UI chrome stays out of the way.
From DNA §14: Minimal. Immersive. Beautiful. Scientific. Cinematic. Responsive. Professional.
**Information first. Animations should explain, not decorate.**

## Palette
| Token | Value | Usage |
|---|---|---|
| `--void` | `#05070c` | Page background — deep space |
| `--surface` | `#0b1018` | Panels, sidebars |
| `--ink` | `#eef2f8` | Primary text |
| `--muted` | `#8b98ab` | Secondary text, timestamps |
| `--gold` | `#f5b942` | Time machine, simulator highlights, key actions |
| `--teal` | `#2dd4bf` | Verified / safe states |

Node colors per type live in KnowledgeGraph.md (teal companies, violet researchers, …).
Edges glow green/yellow/red by strength. Verdict-style semantics never apply here —
this is exploration, not judgment.

## Typography
- **UI**: Inter, system fallback. Neutral, invisible.
- **Data labels** (node names on graph, ids, coordinates): `JetBrains Mono`.
- Scale: hero 44px / panel title 18px / body 14px / caption 11px.

## Motion principles (DNA §14, enforced)
Every animation maps to a data change:
- **World generation**: nodes bloom outward from the seed — staggered, ~2.5s. This *is* the wow moment; choreograph it.
- **Time travel**: nodes morph/fade between snapshots — the animation *is* the history lesson.
- **Simulation**: affected nodes pulse red/gold — the animation *is* the cascade.
- **Expansion**: new nodes graft with a spring — the animation *is* the growth.
- Nothing moves without meaning. Respect `prefers-reduced-motion` (crossfade instead).

## Components
- **UniverseGraph**: full-viewport canvas, 2D force-graph, additive glow. Pan/zoom. Minimap optional (cut if time).
- **NodePanel**: slides from right — name, type chip, description, Reality Meter, "Expand" button, source links.
- **EdgePanel**: bottom sheet — "Why connected?" relation, evidence snippets, source links.
- **LayerBar**: top-left toggle chips — Companies / Research / News / Jobs / Funding / Products. Toggling dims non-members to 15% (layout preserved — context matters).
- **TimeSlider**: bottom center — 2020/2022/2024/2026 with era caption.
- **SimulatorPanel**: scenario input + cascade list + undismissable SIMULATION banner.
- **RealityMeter**: confidence bar + freshness + source count, compact.
- **SerendipityButton**: "Surprise me 🎲" — camera flies to a random emerging node. (No emoji in final UI — use a dice glyph or label.)

## Layout
- Homepage: centered hero — GENESIS, tagline, topic field (pre-filled "Artificial Intelligence"), Generate World button. Nothing else above the fold.
- World view: graph fills the viewport; panels overlay (right sheet, bottom sheet); LayerBar top-left; TimeSlider bottom-center. No dashboard grid.

## Responsive
Desktop-first (judges demo on laptops). Mobile: read-only universe, panels stack full-screen. Not a priority for v1 judging, but must not be broken.

## Print
N/A — no PDF in Genesis v1 (unlike Veritas). If a report is ever needed, it's a future feature.
