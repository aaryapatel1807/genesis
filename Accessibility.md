# Accessibility.md — Genesis a11y Plan

> v1 demo is judged on laptops, but a11y is cheap if designed in — not bolted on.

## Keyboard
- Full graph keyboard operation: `Tab` cycles nodes in a roving order, `Enter` opens NodePanel,
  `E` expands, `Esc` closes panels / resets simulation.
- LayerBar chips, TimeSlider stops, and all buttons are native `<button>`s — focusable by default.
- Visible focus rings: 2px `--gold` outline on dark. Never `outline: none` without replacement.

## Screen readers
- The canvas gets `role="application"` + `aria-label` describing the world
  ("Knowledge universe: 64 entities, 128 connections about Artificial Intelligence").
- Every visual state has a text equivalent: NodePanel and EdgePanel content is real DOM
  (not canvas), so SR users get the full dossier.
- Live region (`aria-live="polite"`) announces: generation complete, expansion results,
  simulation cascades, snapshot changes.
- Decorative glow has `aria-hidden` equivalents — no canvas-only information.

## Motion
- `prefers-reduced-motion`: all four signature animations become 300ms crossfades
  (see Animations.md). Simulation pulse becomes a static highlight.
- No auto-playing animation loops except the simulation pulse — which respects the setting.

## Contrast & text
- Muted `#8b98ab` on void ≈ 7:1; gold on void ≈ 9:1 — AA across the board.
- Minimum 11px caption size; node labels get dark halo for legibility.
- Color is never the only signal: strength also varies edge width; node type also varies shape.

## Honesty as accessibility
- The SIMULATION banner uses `role="alert"` — SR users hear it immediately.
- "No further entities found" empty states are real text, not silent canvas.

## v1 scope note
Full SR graph traversal (beyond roving Tab) and mobile screen-reader tuning are v2.
v1 guarantees: keyboard-operable, announced states, honest text equivalents.
