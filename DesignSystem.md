# DesignSystem.md — Genesis Design Tokens

> Single source of truth for visual values. Tailwind config extends these; no hardcoded
> hex values in components (except via the tokens below).

## Color tokens
```css
--void:    #05070c;  /* page background */
--surface: #0b1018;  /* panels */
--surface-2: #111a26;/* elevated cards */
--ink:     #eef2f8;  /* primary text */
--muted:   #8b98ab;  /* secondary text */
--line:    #1c2635;  /* hairlines */
--gold:    #f5b942;  /* time machine, simulator, primary actions */
--teal:    #2dd4bf;  /* verified / safe */
--red:     #ef4444;  /* simulation alerts, critical */
```

### Node type colors (graph + chips)
| Type | Token | Hex |
|---|---|---|
| company | `--n-company` | `#2dd4bf` |
| researcher | `--n-researcher` | `#a78bfa` |
| university | `--n-university` | `#5aa9ff` |
| product | `--n-product` | `#f5b942` |
| startup | `--n-startup` | `#4ade80` |
| funder | `--n-funder` | `#f472b6` |
| patent | `--n-patent` | `#94a3b8` |
| event | `--n-event` | `#e8edf4` |
| technology | `--n-technology` | `#22d3ee` |
| paper | `--n-paper` | `#818cf8` |
| job | `--n-job` | `#fb923c` |
| country | `--n-country` | `#64748b` |
| government | `--n-government` | `#a8a29e` |
| law | `--n-law` | `#fb7185` |

### Edge strength glow
| Strength | Glow color | Width |
|---|---|---|
| strong | `#4ade80` at 60% | 2.5px |
| medium | `#f5b942` at 50% | 1.75px |
| weak | `#ef4444` at 35% | 1px |

## Typography
| Role | Font | Size / Weight |
|---|---|---|
| Display (hero) | Inter 700 | 44px, -0.02em tracking |
| Panel title | Inter 600 | 18px |
| Body | Inter 400 | 14px / 1.6 |
| Caption | Inter 400 | 11px, `--muted` |
| Data (ids, labels) | JetBrains Mono 500 | 12px |

## Spacing & shape
- Base unit 4px. Panel padding 20px; card radius 14px; chips radius 999px.
- Panel width 340px (right sheet); bottom sheet max-height 40vh.
- Shadows: panels `0 8px 32px rgba(0,0,0,.5)`; glow via canvas shadowBlur, not CSS.

## Iconography
- Inline SVG only, 16px stroke icons (lucide-style paths, hand-rolled — no icon lib in v1).
- Verdict-like semantics don't exist here; icons: expand (⊕), close (×), dice (⚄ as SVG), clock, link-out (↗).

## Tailwind mapping
Extend `tailwind.config.ts`: `colors: { void, surface, ink, muted, gold, ...node colors }`,
`fontFamily: { sans: ['Inter', ...], mono: ['JetBrains Mono', ...] }`.
