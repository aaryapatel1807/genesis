# Components.md — Genesis Component Inventory

> Props are TypeScript interfaces in the component file. All components are client components
> (`"use client"`) except where noted. No component calls SerpApi or Groq directly.

## UniverseGraph.tsx
The canvas. Wraps `react-force-graph-2d` with the Genesis glow theme.
- Props: `{ nodes: Node[], edges: Edge[], onNodeClick, onEdgeClick, dimmed: Set<string>, pulsing: Set<string> }`
- Handles: bloom-in animation on world load, morph on snapshot change, dim/pulse for simulation.
- Node paint: glow via `shadowBlur` + type color; label in JetBrains Mono on hover/zoom.
- Exposes `flyTo(nodeId)` for SerendipityButton.

## NodePanel.tsx
Right sheet on node click.
- Props: `{ node, onExpand, onClose, expanding: boolean }`
- Sections: type chip + name, description, **RealityMeter**, connected list (click jumps),
  source links, **[Expand]** button (disabled with note when budget exhausted).

## EdgePanel.tsx
Bottom sheet on edge click — "Why connected?"
- Props: `{ edge, onClose }`
- Shows: relation label, strength chip, evidence snippets with source links + dates.

## LayerBar.tsx
Top-left toggle chips: Companies / Research / News / Jobs / Funding / Products.
- Props: `{ active: Set<Layer>, onToggle }`
- Toggling dims non-members to 15% opacity (never removes — layout stability).

## TimeSlider.tsx
Bottom-center: 2020 · 2022 · 2024 · 2026 + era caption.
- Props: `{ year, onChange }`
- Changing year cross-fades node sets; caption narrates ("2022 — the generative boom begins").

## SimulatorPanel.tsx
Left overlay: scenario input + cascade list.
- Props: `{ onSimulate, cascades, onReset }`
- Always renders the **SIMULATION banner** when active — undismissable except via Reset.

## RealityMeter.tsx
Compact: confidence bar + "Freshness: 3d ago · 12 sources".
- Props: `{ confidence, freshness, sources }`

## SerendipityButton.tsx
"Surprise me" — picks a random emerging node (top growth, low degree), calls `flyTo`,
opens its NodePanel.
- Props: `{ onSurprise(nodeId) }`

## Homepage (app/page.tsx)
Hero: wordmark, tagline, topic input (v1 fixed to "Artificial Intelligence",
field shown pre-filled and disabled with note "v1: AI Ecosystem"),
**Generate World** button → routes to `/world` with build-up animation.

## Shared
- `CreditPill.tsx`: "31/250 searches" — amber when <20% remaining.
- `Toast.tsx`: API failures, budget notices.
- `EmptyState.tsx`: honest empty messages ("No further entities found in live search.").
