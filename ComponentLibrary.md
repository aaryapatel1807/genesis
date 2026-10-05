# ComponentLibrary.md — Genesis Component Library (Phase 1 · Project)

> Every component below is specified for Figma first, then built in code (Phase 3).
> Tokens referenced from DesignSystem.md. This is the build checklist for the design system.

## Buttons
| Variant | Style | Use |
|---|---|---|
| Primary | Gold `#f5b942` fill, void text, 12px radius | Generate World, key actions |
| Secondary | 1px `--line` border, ink text | Cancel, secondary actions |
| Ghost | Transparent, muted text → ink on hover | Icon buttons, close |
| Danger | Red `#ef4444` fill | Reset simulation, destructive |
Sizes: sm (32px), md (40px), lg (48px). Full-radius (999px) for chips, 12px for actions.

## Inputs
- **Text/Search**: `--surface-2` fill, 1px `--line` border, 12px radius, gold focus ring (2px, 40% opacity).
- **Topic field** (hero): lg size, centered text, mono placeholder.
- **Textarea** (simulator scenario): same treatment, min 3 rows.
- **Select** (snapshot year — native select styled, or custom dropdown in Figma).

## Cards
- **Panel card**: `--surface` fill, 14px radius, `0 8px 32px rgba(0,0,0,.5)` shadow.
- **Glass card** (overlays): `blur(20px) saturate(1.4)`, `rgba(11,16,24,.72)` fill — glassmorphism treatment.
- **Stat card**: surface-2, big mono number + muted label (for source counts, node counts).

## Chips & badges
- **Layer chips** (Companies / Research / News / Jobs / Funding / Products): pill, active = type-color glow border, inactive = muted.
- **Type chips**: dot in node color + label, 11px.
- **Strength chips** (strong/medium/weak): green/gold/red dot + label.
- **SIMULATION badge**: red fill, white text, `role="alert"` — never dismissible except via reset.

## Navigation & sidebar
- **World view**: no top nav — LayerBar (top-left), TimeSlider (bottom-center), actions (top-right) float over canvas.
- **Sidebar** (saved worlds / settings pages): 260px, surface fill, section labels in muted caps, active item gold left-border.
- **Breadcrumbs**: mono, muted — world / node name.

## Modals & sheets
- **NodePanel**: right sheet, 340px, slide-in 250ms.
- **EdgePanel**: bottom sheet, max 40vh, slide-in 200ms.
- **Confirm modal**: centered glass card, 400px max — used for destructive actions only.

## Tables
- **Evidence table** (edge panel): rows = source, snippet, date. Zebra none; row hover surface-2; link-out icon per row.
- **Source list** (node panel): domain + freshness dot + date, compact rows.

## Charts (minimal in v1)
- **Sparkline**: funding/growth trend per node (canvas or SVG, 7 points max).
- **Snapshot bars**: node-count per year in TimeSlider tooltip.

## Timeline
- **TimeSlider**: 4 stops (2020/2022/2024/2026), gold active stop, era caption below in muted italic.
- **Story mode timeline** (🔶): vertical, event dots glow white, connector line 1px `--line`.

## Knowledge nodes (the heart of the library)
14 types — color + shape per KnowledgeGraph.md. Three sizes by influence score
(small 8px / medium 14px / large 22px radius). States:
| State | Treatment |
|---|---|
| Default | Fill type color at 85%, glow 18px |
| Hover | Scale 1.15, label fades in (mono 12px + dark halo) |
| Selected | White 2px ring + glow boost |
| Dimmed | 15% opacity (layer filter, simulation) |
| Pulsing | Red/gold pulse 1.2s loop (simulation only) |

## Connection lines
| Strength | Color | Width | Style |
|---|---|---|---|
| strong | green `#4ade80` 60% | 2.5px | solid |
| medium | gold `#f5b942` 50% | 1.75px | solid |
| weak | red `#ef4444` 35% | 1px | dashed |
Simulation cascade: animated dash flow toward affected nodes.

## Glassmorphism rules
- Only on floating overlays (panels, modals, toasts) — never on the canvas background.
- `backdrop-blur(20px)`, fill `rgba(11,16,24,.72)`, 1px `rgba(255,255,255,.06)` top highlight.

## Dark / light themes
- **Dark** (v1, primary): tokens as specified — "Cinematic Observatory".
- **Light** (Phase 1 deliverable, build in v2): void→`#f4f6fa`, surface→`#ffffff`,
  ink→`#0b1018`, node colors deepen 15% for contrast on white. Same shapes, same motion.

## Animation rules (summary — full spec in Animations.md)
Bloom 2.5s on generate · morph 900ms on time travel · pulse 1.2s on simulate ·
graft 700ms spring on expand · panels 200–250ms · `prefers-reduced-motion` → crossfades.
