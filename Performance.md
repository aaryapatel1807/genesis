# Performance.md — Genesis Performance Budget

## Budgets (demo on a mid-range laptop)
| Metric | Budget |
|---|---|
| Homepage LCP | < 1.5s |
| World view interactive | < 2s after world.json loads |
| `world.json` transfer | < 500 KB gzipped |
| Graph frame rate | 60fps at ≤ 200 nodes |
| Expansion round-trip | < 4s (SerpApi + Groq + graft) |
| Simulator response | < 5s |

## How we hit them
- **world.json size**: cap nodes at ~80 for the present world; descriptions ≤ 2 sentences;
  evidence snippets ≤ 3 per edge. Snapshots lazy-loaded per year.
- **Graph perf**: canvas (not SVG/DOM) via `react-force-graph-2d`; node paint is one
  `fillRect`-ish path + glow; labels only on hover/zoom (no per-frame text layout).
  Beyond ~120 nodes, group fade-ins instead of per-node animation (see Animations.md).
- **Bundle**: no icon lib, no chart lib, no state lib — React + Next + force-graph only.
  Dynamic-import the graph component (it's the heavy one).
- **Expansion**: parallelize SerpApi calls (≤2), stream nothing — one JSON response.
- **Images**: none in v1 (pure canvas + CSS). Zero image optimization problems by construction.

## Anti-goals
No SSR streaming heroics, no edge functions, no ISR. The world is static JSON —
the fastest possible backend is no backend.
