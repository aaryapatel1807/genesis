# UIUX.md — Genesis UX Specification

## UX principles (from DNA §14 + DESIGN.md)
1. **The universe is the interface.** Chrome stays minimal; the graph fills the viewport.
2. **Every state is designed.** Loading, empty, error, and capped-budget states are first-class —
   the demo must never show a blank screen or a raw error.
3. **Progressive disclosure.** Homepage → world → node detail → edge evidence. Never more
   than one panel open at a time on desktop; full-screen sheets on mobile.
4. **Honesty in every state.** "No further entities found" instead of invented nodes;
   SIMULATION banner that can't be dismissed; Reality Meter always visible.

## Information architecture
```
 /                        → Hero: GENESIS, tagline, topic field, [Generate World]
 /world                   → Universe view (graph fullscreen + overlays)
 /world?snapshot=2022     → Time-travel state (shareable link)
 /world?node=n_openai     → Deep link to a node panel
```

## Screen-by-screen

### Homepage
- Centered hero: wordmark GENESIS, tagline "Ask anything. Watch a world emerge.",
  topic input pre-filled "Artificial Intelligence", primary button **Generate World**.
- Below fold: 3-step "how it works" (Generate → Explore → Simulate), each one line.
- Footer: "Built with SerpApi live search · Demo for SerpApi India Hackathon 2026".
- No nav bar. No clutter. One action.

### World view
- **Canvas**: force-graph fills viewport. Nodes glow by type color; edges glow by strength.
- **Top-left**: LayerBar chips (Companies / Research / News / Jobs / Funding / Products).
- **Bottom-center**: TimeSlider (2020 · 2022 · 2024 · 2026) with era caption.
- **Top-right**: "Surprise me" button + Simulator toggle + credit indicator ("31/250 searches").
- **Right sheet**: NodePanel on node click. **Bottom sheet**: EdgePanel on edge click.
- **Simulator mode**: input + cascade list overlay left; SIMULATION banner top-center.

## Interaction patterns
- Hover node → tooltip (name, type, influence). Click → panel. Double-click → expand.
- Hover edge → tooltip (relation). Click → evidence panel.
- Drag node → pin it (physics respects the pin). ESC → close panels / reset simulation.
- Scroll zooms the graph; page itself doesn't scroll in world view.

## States
| State | Design |
|---|---|
| Generating | 2s staged build-up: seed node → categories bloom → full universe. Skeleton shimmer behind. |
| Expanding | New nodes pulse in with spring graft; spinner on the node. |
| Empty expansion | Panel note: "No further entities found in live search." (never invented) |
| Budget exhausted | Amber banner: "Live expansion paused — showing cached universe." Graph keeps working. |
| API failure | Serve cached world; toast: "Live search unavailable — cached world loaded." |
| No results (scholar/jobs) | Layer shows dimmed with "no data in snapshot" note, not an error. |

## Mobile (v1: functional, not fancy)
Graph read-only (pan/zoom), panels become full-screen sheets, LayerBar becomes a
horizontal scroll row, TimeSlider stays bottom. Must not break; polish is desktop-first.
