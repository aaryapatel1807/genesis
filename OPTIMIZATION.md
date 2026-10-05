# OPTIMIZATION.md — Genesis Phase 9 notes

## What was already fast (verified, not changed)
- **Bundle**: no icon lib, no chart lib, no state lib — React + Next + react-force-graph-2d only.
- **Graph**: canvas rendering via react-force-graph-2d; the rAF repaint loop runs only
  during bloom-in or simulation pulse; `graphData` memoized.
- **UniverseGraph** already `next/dynamic` with `ssr: false` — the heavy canvas dep never
  touches the server bundle or first paint.
- **Data**: `world.json` (~74 nodes) + per-year snapshots lazy-loaded; no images in v1.

## Changes in Phase 9

### Caching headers (next.config.js)
- `/data/*` → `Cache-Control: public, max-age=31536000, immutable`. The world and
  snapshots are content-stable build artifacts; the CDN now serves them for a year.
- Security headers on all routes: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### SEO (app/layout.tsx)
- Full metadata: description, `metadataBase`, OpenGraph, Twitter card,
  `themeColor: #05070c`, robots. Before: title + one-line description only.

### Mobile 390px
- World caption hidden below `sm:` — it overlapped the LayerBar and action cluster
  (arena BUG 10, pixel-verified from class strings).
- TimeSlider: `max-w-[92vw]` + `overflow-x-auto` guard for very narrow viewports.
- Panels already `max-w-[92vw]` sheets; EdgePanel is a bottom sheet — no changes needed.

### Accessibility (verified against Accessibility.md)
- Gold `:focus-visible` ring on all interactive elements (globals.css).
- LayerBar/TimeSlider: `aria-pressed` + labels; canvas `role="application"` with
  keyboard nav (arrows/Enter/E/Esc); `aria-live` announcements for load/expand/simulate;
  RealityMeter `role="progressbar"`; CreditPill `role="status"`.
- `prefers-reduced-motion` → bloom/pulse become static states.

## Before / after
| Area | Before | After |
|---|---|---|
| `/data/*` caching | default Next static handling | immutable, 1-year CDN cache |
| SEO | title + description | + OG, Twitter, theme-color, robots |
| 390px caption | overlapped LayerBar | hidden on small screens |
| TimeSlider | could overflow at <360px | scroll-guarded |
| Security headers | none | nosniff, DENY, strict-origin-when-cross-origin |

## Deliberately not done
- Image optimization: no images in v1 — nothing to optimize.
- ISR/edge functions: the world is static JSON; no backend to stream.
- Light theme: v2 (boards exist as reference).
