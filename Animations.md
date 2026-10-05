# Animations.md — Genesis Motion Specification

> DNA §14: "Animations should explain. Not decorate." Every animation below maps to a data
> change. If it doesn't explain something, it doesn't ship.

## The four signature motions
| Moment | Animation | Duration / easing | What it explains |
|---|---|---|---|
| World generation | Nodes bloom outward from seed, staggered by category | 2.5s, `easeOutExpo`, 40ms stagger | The universe *being built* — the wow moment |
| Time travel | Nodes fade/scale between snapshots; edges rewire | 900ms, `easeInOutCubic` | History morphing — evolution made visible |
| Simulation | Affected nodes pulse red/gold; others dim to 25% | pulse 1.2s loop, `easeInOutSine` | The cascade — cause and effect |
| Expansion | New nodes spring-graft from parent | 700ms spring (damping 0.7) | Growth — the world getting bigger |

## Supporting motion
- Panels: slide-in 250ms `easeOutCubic` (right sheet), 200ms (bottom sheet).
- Layer toggle: opacity crossfade 300ms — never layout shift.
- Hover: node scale 1.15 + label fade-in, 120ms. Cheap, canvas-native.
- Serendipity: camera `flyTo` 1.4s `easeInOutCubic` — the journey *is* the delight.

## Implementation notes
- All graph animation via `react-force-graph-2d` paint callbacks + d3 transitions;
  no CSS animation on canvas internals.
- Stagger generation by category order: seed → companies → research → products → rest.
- Cap concurrent animated nodes at ~120; beyond that, fade in groups (perf).
- `prefers-reduced-motion`: replace bloom/morph/pulse with 300ms crossfades. Non-negotiable.

## What we don't animate
- No parallax hero, no floating orbs, no decorative particles.
- No animation on data that didn't change (re-renders must be visually silent).
