# Theme.md — Genesis Theming

## v1: Dark only
Genesis ships one theme: the dark "Cinematic Observatory" (see DESIGN.md).
No light mode in v1 — the glow aesthetic *is* the product identity, and a light theme
would double the design QA the night before submission. (v2 can add it.)

## CSS variables
Defined in `app/globals.css` under `:root`, mirroring DesignSystem.md tokens:
```css
:root {
  --void: #05070c; --surface: #0b1018; --surface-2: #111a26;
  --ink: #eef2f8; --muted: #8b98ab; --line: #1c2635;
  --gold: #f5b942; --teal: #2dd4bf; --red: #ef4444;
  --n-company: #2dd4bf; --n-researcher: #a78bfa; /* …all 14 node colors… */
}
```

## Tailwind config
`tailwind.config.ts` extends:
```ts
theme: { extend: {
  colors: { void:'var(--void)', surface:'var(--surface)', ink:'var(--ink)',
            muted:'var(--muted)', gold:'var(--gold)', teal:'var(--teal)', red:'var(--red)' },
  fontFamily: { sans:['Inter','system-ui'], mono:['JetBrains Mono','monospace'] },
}}
```

## Glow implementation
- Canvas nodes: `ctx.shadowColor = color; ctx.shadowBlur = 18;` in the node paint callback.
- DOM accents (chips, active states): `box-shadow: 0 0 12px color-mix(in srgb, <color> 45%, transparent)`.
- Never glow body text — glow is for nodes, edges, and key actions only.

## Background
Subtle radial vignette: `radial-gradient(ellipse at center, #0b1220 0%, #05070c 70%)`
on the world view. One layer. No starfields, no grids by default (a faint dot grid at
4% opacity is allowed on the homepage hero only).

## Contrast discipline
Muted text `#8b98ab` on `#05070c` ≈ 7:1 — AA-safe. Gold `#f5b942` on void ≈ 9:1.
Node labels on canvas get a dark halo (`strokeText`) for legibility over glow.
