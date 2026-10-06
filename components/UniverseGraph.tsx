'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import ForceGraph2D, {
  type ForceGraph2DMethods,
  type ForceGraphLink,
  type ForceGraphNode,
} from 'react-force-graph-2d';
import {
  CATEGORIES,
  CATEGORY_COLORS_LIGHT,
  categoryColor,
  categoryOf,
  type Category,
} from '@/lib/category';
import { getTheme, type Theme } from '@/lib/theme';
import { forceCollide, forceX, forceY } from 'd3-force';
import {
  CONTAIN_MAIN_RADIUS,
  CONTAIN_SATELLITE_RADIUS,
  computeDegrees,
  edgeCurveSign,
  initializePositions,
  nodeRadius,
  topLabelIds,
} from '@/lib/graphLayout';
import {
  type GEdge,
  type GNode,
  type NodeType,
  type Strength,
} from '@/lib/types';

export interface UniverseGraphProps {
  nodes: GNode[];
  edges: GEdge[];
  onNodeClick: (node: GNode) => void;
  onEdgeClick: (edge: GEdge) => void;
  dimmed: Set<string>;
  pulsing: Set<string>;
  onNodeExpand?: (node: GNode) => void;
  onBackgroundClick?: () => void;
  /**
   * Generation-sequence reveal. While false the canvas stays dark (the
   * GenerationSequence overlay owns the screen); flipping to true starts
   * the choreographed bloom: nodes stagger in, edges draw, camera zooms.
   * Defaults to true so snapshot swaps keep the existing bloom behavior.
   */
  introReveal?: boolean;
  /**
   * Interaction gate — false until the sequence reaches "ready".
   * Defaults to true.
   */
  interactive?: boolean;
  /**
   * Category filter. null (or an empty array) = every category visible.
   * When set, non-matching nodes render dimmed/small and matching nodes
   * glow; the transition tweens on the canvas (~180ms, eased).
   */
  activeCategories?: string[] | null;
  /**
   * Called when a legend pill is toggled. When provided the legend renders
   * as keyboard-accessible toggle buttons; otherwise it is a static list.
   */
  onCategoryToggle?: (categoryId: string) => void;
}

export interface UniverseGraphHandle {
  flyTo: (nodeId: string) => void;
  /** Cinematic camera descent used by the generation sequence. */
  introZoom: () => void;
}

const EDGE_TOKEN: Record<Strength, { token: string; fallback: string; lightFallback: string; alpha: number; width: number }> = {
  strong: { token: '--n-startup', fallback: '#4ade80', lightFallback: CATEGORY_COLORS_LIGHT.research!, alpha: 0.6, width: 2.5 },
  medium: { token: '--gold', fallback: '#f5b942', lightFallback: CATEGORY_COLORS_LIGHT.funding!, alpha: 0.5, width: 1.75 },
  weak: { token: '--red', fallback: '#ef4444', lightFallback: CATEGORY_COLORS_LIGHT.news!, alpha: 0.35, width: 1 },
};

const edgeColorCache = new Map<string, string>();
const categoryColorCache = new Map<string, string>();
const tokenValueCache = new Map<string, string>();

/** Live theme, read at paint time from the <html> data-theme attribute. */
function currentTheme(): Theme {
  return getTheme();
}

/**
 * Glow scale per theme: full neon in dark, soft/subtle in light.
 * Applied to every canvas shadowBlur so glow never burns on light bg.
 */
function glowScale(theme: Theme): number {
  return theme === 'light' ? 0.35 : 1;
}

/**
 * Resolve a design token to its live CSS value, cached per theme so the
 * canvas picks up the theme switch without a reload. SSR-safe fallback.
 */
function tokenValue(token: string, fallback: string): string {
  const theme = currentTheme();
  const key = `${theme}:${token}`;
  let value = tokenValueCache.get(key);
  if (!value) {
    value = fallback;
    if (typeof document !== 'undefined') {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(token)
        .trim();
      if (v) value = v;
    }
    tokenValueCache.set(key, value);
  }
  return value;
}

/**
 * Category paint colors resolve from the --cat-* design tokens
 * (globals.css) so the canvas never carries hardcoded hex — one cache per
 * category per theme, SSR-safe fallback to the lib/category.ts palette.
 */
function categoryPaintColor(cat: Category): string {
  const theme = currentTheme();
  const key = `${theme}:${cat.id}`;
  let color = categoryColorCache.get(key);
  if (!color) {
    color = categoryColor(cat.id, theme);
    if (typeof document !== 'undefined') {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(`--cat-${cat.id}`)
        .trim();
      if (v) color = v;
    }
    categoryColorCache.set(key, color);
  }
  return color;
}

/** Normalise the filter prop: null/empty = every category visible. */
function activeCategorySet(
  activeCategories: string[] | null | undefined,
): Set<string> | null {
  if (!activeCategories || activeCategories.length === 0) return null;
  return new Set(activeCategories);
}

/**
 * Edge colors resolve from the design tokens (globals.css) so the canvas
 * never carries hardcoded hex — one cache per token per theme, SSR-safe
 * fallback from the theme palette. In light mode strokes also paint
 * slightly thicker and more opaque so they stay readable on #f3f5ff.
 */
function edgeStyle(strength: Strength): { color: string; alpha: number; width: number } {
  const theme = currentTheme();
  const spec = EDGE_TOKEN[strength] ?? EDGE_TOKEN.medium!;
  const key = `${theme}:${spec.token}`;
  let color = edgeColorCache.get(key);
  if (!color) {
    color = theme === 'light' ? spec.lightFallback : spec.fallback;
    if (typeof document !== 'undefined') {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(spec.token)
        .trim();
      if (v) color = v;
    }
    edgeColorCache.set(key, color);
  }
  const lightBoost = theme === 'light';
  return {
    color,
    alpha: lightBoost ? Math.min(1, spec.alpha * 1.3) : spec.alpha,
    width: lightBoost ? spec.width * 1.25 : spec.width,
  };
}

interface PaintNode extends ForceGraphNode {
  name: string;
  type: NodeType;
  influence: number;
}

interface PaintLink {
  id: string;
  source: unknown;
  target: unknown;
  relation: string;
  strength: Strength;
}

function endpointId(p: unknown): string | null {
  if (p === null || p === undefined) return null;
  if (typeof p === 'object') {
    const node = p as ForceGraphNode;
    if (node.id === null || node.id === undefined) return null;
    return String(node.id);
  }
  return String(p);
}

const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1);
const easeOutCubic = (v: number): number => 1 - Math.pow(1 - v, 3);

export const UniverseGraph = forwardRef<UniverseGraphHandle, UniverseGraphProps>(
  function UniverseGraph(props, ref) {
    const { nodes, edges, onNodeClick, onEdgeClick, dimmed, pulsing } = props;
    const introReveal = props.introReveal ?? true;
    const interactive = props.interactive ?? true;

    const wrapRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<ForceGraph2DMethods | null>(null);
    const [size, setSize] = useState({ width: 800, height: 600 });
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [bloomActive, setBloomActive] = useState(false);

    // Refs synced every render so paint callbacks (captured once by the
    // library) always see fresh state.
    const dimmedRef = useRef(dimmed);
    dimmedRef.current = dimmed;
    const pulsingRef = useRef(pulsing);
    pulsingRef.current = pulsing;
    const hoveredRef = useRef(hoveredId);
    hoveredRef.current = hoveredId;
    const focusedRef = useRef(focusedId);
    focusedRef.current = focusedId;
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const callbacksRef = useRef({ onNodeClick, onEdgeClick, onNodeExpand: props.onNodeExpand, onBackgroundClick: props.onBackgroundClick });
    callbacksRef.current = { onNodeClick, onEdgeClick, onNodeExpand: props.onNodeExpand, onBackgroundClick: props.onBackgroundClick };
    const bloomStartAtRef = useRef(new Map<string, number>()); // id -> absolute start time
    const linkRevealAtRef = useRef(new Map<string, number>()); // edge id -> absolute draw start
    const reducedMotionRef = useRef(false);
    const prevIdsRef = useRef<Set<string>>(new Set());
    const introRevealRef = useRef(introReveal);
    introRevealRef.current = introReveal;
    const activeCatsRef = useRef(props.activeCategories ?? null);
    activeCatsRef.current = props.activeCategories ?? null;
    /**
     * Persistent node positions: settled coordinates survive re-renders so
     * snapshot swaps and expansions never teleport the graph. New nodes get
     * a clustered initial placement; everything else restores from here.
     */
    const posCacheRef = useRef(new Map<string, { x: number; y: number }>());
    /** Ids parked on the satellite arc (tiny disconnected components). */
    const satRef = useRef(new Set<string>());
    /** Degree per node id (visual sizing) and the always-labelled top set. */
    const degreeRef = useRef(new Map<string, number>());
    const labelSetRef = useRef(new Set<string>());
    /** Memoized deterministic edge-curvature signs. */
    const curveSignRef = useRef(new Map<string, 1 | -1>());

    /**
     * Custom d3 force: soft containment. Nodes drifting beyond their allowed
     * radius get eased back — the main cluster stays within
     * CONTAIN_MAIN_RADIUS, satellites within CONTAIN_SATELLITE_RADIUS. This
     * is what stops small components drifting off to nowhere.
     */
    const containmentRef = useRef<((alpha: number) => void) | null>(null);
    if (containmentRef.current === null) {
      let simNodes: PaintNode[] = [];
      const force = (alpha: number): void => {
        const sats = satRef.current;
        for (const n of simNodes) {
          if (typeof n.x !== 'number' || typeof n.y !== 'number') continue;
          const maxR = sats.has(String(n.id))
            ? CONTAIN_SATELLITE_RADIUS
            : CONTAIN_MAIN_RADIUS;
          const r = Math.hypot(n.x, n.y);
          if (r > maxR) {
            const k = ((r - maxR) / r) * alpha * 0.5;
            n.vx = (n.vx ?? 0) - n.x * k;
            n.vy = (n.vy ?? 0) - n.y * k;
          }
        }
      };
      (
        force as unknown as { initialize: (nodes: PaintNode[]) => void }
      ).initialize = (nodes) => {
        simNodes = nodes;
      };
      containmentRef.current = force;
    }

    /** Write settled coordinates back to the cache (fired on engine stop). */
    const snapshotPositions = useCallback((): void => {
      const g = graphRef.current;
      if (!g) return;
      const cache = posCacheRef.current;
      for (const n of g.graphData().nodes as unknown as PaintNode[]) {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          cache.set(String(n.id), { x: n.x, y: n.y });
        }
      }
    }, []);
    /**
     * Per-node category-focus value (1 = full focus, 0 = filtered out).
     * Animated toward its target each repaint tick so the filter
     * transition tweens instead of snapping.
     */
    const focusRef = useRef(new Map<string, number>());
    const bloomActiveRef = useRef(false);
    bloomActiveRef.current = bloomActive;

    useEffect(() => {
      reducedMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
    }, []);

    // Container sizing
    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const update = (): void => {
        const rect = el.getBoundingClientRect();
        setSize({ width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) });
      };
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Theme changes re-resolve every cached token (caches are keyed per
    // theme) and force a full repaint so the canvas follows the toggle.
    useEffect(() => {
      const obs = new MutationObserver(() => {
        graphRef.current?.refresh();
      });
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      return () => obs.disconnect();
    }, []);

    const edgesRef = useRef(edges);
    edgesRef.current = edges;
    const bloomTimerRef = useRef<number | null>(null);
    const revealedOnceRef = useRef(introReveal);

    /**
     * Records staggered bloom start times for newly added nodes and
     * staggered draw times for edges. Merges into the existing maps so
     * pre-existing nodes keep progress 1; prunes ids that left the graph.
     * Returns the milliseconds until the choreography settles.
     */
    const recordReveal = (now0: number): number => {
      const ids = nodesRef.current.map((n) => n.id);
      const edgeIds = edgesRef.current.map((e) => e.id);
      const current = new Set(ids);
      const prev = prevIdsRef.current;
      const added = ids.filter((id) => !prev.has(id));
      prevIdsRef.current = current;

      const starts = new Map(bloomStartAtRef.current);
      for (const id of starts.keys()) {
        if (!current.has(id)) starts.delete(id);
      }
      added.forEach((id, i) => starts.set(id, now0 + Math.min(i * 40, 2500)));
      bloomStartAtRef.current = starts;

      const linkStarts = new Map(linkRevealAtRef.current);
      const currentEdges = new Set(edgeIds);
      for (const id of linkStarts.keys()) {
        if (!currentEdges.has(id)) linkStarts.delete(id);
      }
      edgeIds.forEach((id, i) => {
        if (!linkStarts.has(id)) {
          linkStarts.set(id, now0 + 500 + Math.min(i * 10, 1600));
        }
      });
      linkRevealAtRef.current = linkStarts;

      if (reducedMotionRef.current) {
        setBloomActive(false);
        return 0;
      }
      setBloomActive(true);
      return Math.min(Math.max(added.length - 1, 0) * 40, 2500) + 2300;
    };

    const scheduleBloomEnd = (settleMs: number): void => {
      if (bloomTimerRef.current !== null) {
        window.clearTimeout(bloomTimerRef.current);
      }
      bloomTimerRef.current = window.setTimeout(() => {
        setBloomActive(false);
        bloomTimerRef.current = null;
      }, settleMs);
    };

    useEffect(
      () => () => {
        if (bloomTimerRef.current !== null) {
          window.clearTimeout(bloomTimerRef.current);
        }
      },
      [],
    );

    // Generation-sequence handover: the FIRST time introReveal flips true,
    // choreograph the full bloom (nodes stagger, edges draw after).
    useEffect(() => {
      if (!introReveal || revealedOnceRef.current) return;
      revealedOnceRef.current = true;
      scheduleBloomEnd(recordReveal(performance.now()));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [introReveal]);

    // Bloom-in for later changes (expansions, snapshot swaps): stagger only
    // the newly appearing nodes. Deferred while the sequence owns the screen.
    useEffect(() => {
      if (!introRevealRef.current) return;
      const ids = nodes.map((n) => n.id);
      const prev = prevIdsRef.current;
      const added = ids.filter((id) => !prev.has(id));
      if (added.length === 0) return;
      scheduleBloomEnd(recordReveal(performance.now()));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes]);

    /**
     * Force tuning — the library defaults are what produced the hairball
     * (weak repulsion, no collision, uniform link distance). Tuned for
     * ~74 nodes / ~120 edges:
     * - charge: strong repulsion (-170) with a 600-unit range cap so
     *   satellites aren't flung by the far side of the main cluster;
     * - link distance by edge strength (strong ties pull tight);
     * - collide: node radius + margin, so nodes never overlap;
     * - gentle x/y gravity toward center;
     * - contain: custom soft containment (see containmentRef).
     * Reheats the simulation so data changes re-settle cleanly.
     */
    useEffect(() => {
      const g = graphRef.current;
      if (!g) return;
      const charge = g.d3Force('charge');
      charge?.strength(-170);
      charge?.distanceMax(600);
      const link = g.d3Force('link');
      link?.distance((l: { strength?: Strength }) =>
        l.strength === 'weak' ? 110 : l.strength === 'strong' ? 55 : 80,
      );
      const degrees = degreeRef.current;
      g.d3Force(
        'collide',
        forceCollide<ForceGraphNode>()
          .radius((d) => nodeRadius(degrees.get(String(d.id)) ?? 0) + 8)
          .strength(0.85)
          .iterations(2),
      );
      g.d3Force('x', forceX(0).strength(0.035));
      g.d3Force('y', forceY(0).strength(0.035));
      const contain = containmentRef.current;
      if (contain) g.d3Force('contain', contain);
      g.d3ReheatSimulation();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges]);

    // Repaint loop while bloom, simulation pulse, or the category-filter
    // tween is active. stepCategoryFocus returns true while any node is
    // still travelling toward its target focus value.
    const stepCategoryFocus = useCallback((): boolean => {
      const active = activeCategorySet(activeCatsRef.current);
      const reduced = reducedMotionRef.current;
      const map = focusRef.current;
      const nodes = nodesRef.current;
      const alive = new Set<string>();
      let moving = false;
      for (const n of nodes) {
        alive.add(n.id);
        const target =
          active === null || active.has(categoryOf(n.type).id) ? 1 : 0;
        const cur = map.get(n.id) ?? 1;
        if (reduced) {
          if (cur !== target) map.set(n.id, target);
          continue;
        }
        if (Math.abs(target - cur) < 0.02) {
          if (cur !== target) map.set(n.id, target);
          continue;
        }
        map.set(n.id, cur + (target - cur) * 0.18);
        moving = true;
      }
      for (const id of map.keys()) {
        if (!alive.has(id)) map.delete(id);
      }
      return moving;
    }, []);

    useEffect(() => {
      let raf = 0;
      let alive = true;
      const loop = (): void => {
        if (!alive) return;
        const tweening = stepCategoryFocus();
        graphRef.current?.refresh();
        if (
          bloomActiveRef.current ||
          pulsingRef.current.size > 0 ||
          tweening
        ) {
          raf = requestAnimationFrame(loop);
        }
      };
      raf = requestAnimationFrame(loop);
      return () => {
        alive = false;
        cancelAnimationFrame(raf);
      };
    }, [bloomActive, pulsing, stepCategoryFocus, props.activeCategories]);

    useImperativeHandle(
      ref,
      () => ({
        flyTo(nodeId: string): void {
          const target = nodesRef.current.find((n) => n.id === nodeId);
          const g = graphRef.current;
          if (!target || !g) return;
          const px = (target as PaintNode).x;
          const py = (target as PaintNode).y;
          if (typeof px !== 'number' || typeof py !== 'number') return;
          g.centerAt(px, py, 1400);
          g.zoom(2.4, 1400);
        },
        introZoom(): void {
          // Cinematic descent for the generation sequence: start wide and
          // far, then settle into the universe. Reduced motion: jump cut.
          const g = graphRef.current;
          if (!g) return;
          if (reducedMotionRef.current) {
            g.zoom(1.05, 0);
            return;
          }
          g.zoom(0.45, 0);
          g.zoom(1.05, 2200);
        },
      }),
      [],
    );

    const graphData = useMemo(() => {
      // Clustered initial layout: nodes without coordinates start grouped
      // by category on a ring (tiny components on the satellite arc).
      // Settled nodes restore from the cache — never teleport.
      const placements = initializePositions(nodes, edges);
      const cache = posCacheRef.current;
      const sats = satRef.current;
      const alive = new Set<string>();
      const gnodes = nodes.map((n) => {
        alive.add(n.id);
        const cached = cache.get(n.id);
        if (cached) {
          return { ...n, x: cached.x, y: cached.y } as ForceGraphNode;
        }
        const p = placements.get(n.id);
        const x = p?.x ?? 0;
        const y = p?.y ?? 0;
        cache.set(n.id, { x, y });
        if (p?.satellite) sats.add(n.id);
        return { ...n, x, y } as ForceGraphNode;
      });
      // Prune ids that left the graph.
      for (const id of [...cache.keys()]) if (!alive.has(id)) cache.delete(id);
      for (const id of [...sats]) if (!alive.has(id)) sats.delete(id);
      // Visual hierarchy inputs, shared with paint + forces.
      const degrees = computeDegrees(nodes, edges);
      degreeRef.current = degrees;
      labelSetRef.current = topLabelIds(nodes, degrees, 12);
      return {
        nodes: gnodes,
        links: edges.map((e) => ({ ...e }) as unknown as ForceGraphLink),
      };
    }, [nodes, edges]);

    // Bloom progress for one node id: ids with no start entry (pre-existing
    // nodes) are fully visible. Shared by paintNode and paintLink so a link
    // fades in together with its endpoint nodes instead of floating detached.
    const bloomProgress = (id: string, now: number): number => {
      if (reducedMotionRef.current) return 1;
      const startAt = bloomStartAtRef.current.get(id) ?? 0; // 0 = long past -> progress 1
      return easeOutCubic(clamp01((now - startAt) / 600));
    };

    const paintNode = (
      raw: ForceGraphNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ): void => {
      // The generation sequence owns the screen until reveal.
      if (!introRevealRef.current) return;
      const n = raw as unknown as PaintNode;
      if (typeof n.x !== 'number' || typeof n.y !== 'number') return;

      const id = String(n.id);
      // v2: nodes paint with their semantic category color; teal/amber stay
      // reserved for UI chrome (edges, highlights, accents).
      const cat = categoryOf(n.type);
      const color = categoryPaintColor(cat);
      const isDimmed = dimmedRef.current.has(id);
      const isPulsing = pulsingRef.current.has(id);
      const isHot = hoveredRef.current === id || focusedRef.current === id;
      const reduced = reducedMotionRef.current;

      // Category-filter focus (1 = full, 0 = filtered out), tweened.
      const focus = focusRef.current.get(id) ?? 1;
      const filterOn = activeCategorySet(activeCatsRef.current) !== null;

      // Bloom progress (staggered per node, eased)
      const now = performance.now();
      const progress = bloomProgress(id, now);

      // Visual hierarchy: radius by degree (hubs read as hubs). Influence in
      // the dataset spans a narrow band, so degree discriminates far better.
      const degree = degreeRef.current.get(id) ?? 0;
      const baseR = nodeRadius(degree);
      const r =
        baseR *
        (0.5 + 0.5 * progress) *
        (0.55 + 0.45 * focus) *
        (isHot ? 1.15 : 1);

      const theme = currentTheme();
      const glow = glowScale(theme);

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.15 : (0.15 + 0.85 * focus) * progress;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18 * focus * glow;
      ctx.fillStyle = color;
      // Circles only: shape variety was visual noise, not information —
      // category is already encoded in color (see legend).
      ctx.beginPath();
      ctx.arc(n.x, n.y, Math.max(r, 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Filtered-out nodes get no labels or glow; matching nodes glow.
      if (filterOn && focus > 0.9 && !isDimmed) {
        const halo = reduced ? 0.4 : 0.3 + 0.15 * Math.sin(now / 420);
        ctx.save();
        ctx.globalAlpha = halo;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6 / globalScale;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 * glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Simulation pulse: oscillating gold ring (static ring if reduced motion)
      if (isPulsing && !isDimmed) {
        const pulseGold = tokenValue('--gold', '#f5b942');
        const phase = reduced ? 1 : Math.sin(now / 300);
        const ringR = r + 5 + (reduced ? 0 : 2 * phase);
        ctx.save();
        ctx.globalAlpha = reduced ? 0.9 : 0.5 + 0.4 * phase;
        ctx.strokeStyle = pulseGold;
        ctx.lineWidth = 2 / globalScale;
        ctx.shadowColor = pulseGold;
        ctx.shadowBlur = 12 * glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Labels: only the top-12 most important nodes get permanent labels
      // (JetBrains Mono with a theme-aware halo); everything else labels on
      // hover/focus. No more label soup.
      if (
        (isHot || labelSetRef.current.has(id)) &&
        progress > 0.8 &&
        !isDimmed
      ) {
        const fontSize = 12 / globalScale;
        ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ly = n.y + r + 4 / globalScale;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = tokenValue('--bg', 'rgba(5,7,12,0.9)');
        ctx.strokeText(n.name, n.x, ly);
        ctx.fillStyle = tokenValue('--ink', '#eef2f8');
        ctx.fillText(n.name, n.x, ly);
        ctx.restore();
      }
    };

    const paintLink = (
      raw: ForceGraphLink,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ): void => {
      // The generation sequence owns the screen until reveal.
      if (!introRevealRef.current) return;
      const e = raw as unknown as PaintLink;
      const sId = endpointId(e.source);
      const tId = endpointId(e.target);
      const sObj = (typeof e.source === 'object' ? e.source : null) as PaintNode | null;
      const tObj = (typeof e.target === 'object' ? e.target : null) as PaintNode | null;
      if (!sObj || !tObj) return;
      if (typeof sObj.x !== 'number' || typeof tObj.x !== 'number') return;

      const style = edgeStyle(e.strength);
      const isDimmed =
        (sId !== null && dimmedRef.current.has(sId)) ||
        (tId !== null && dimmedRef.current.has(tId));

      ctx.save();
      const nowL = performance.now();
      const reducedL = reducedMotionRef.current;
      // Edges draw in AFTER their endpoints bloom: per-edge staged start.
      const edgeStart = linkRevealAtRef.current.get(e.id) ?? 0;
      const drawProgress = reducedL
        ? 1
        : easeOutCubic(clamp01((nowL - edgeStart) / 600));
      const linkProgress =
        Math.min(
          bloomProgress(sId ?? '', nowL),
          bloomProgress(tId ?? '', nowL),
        ) * drawProgress;
      ctx.globalAlpha = isDimmed ? 0.15 : style.alpha * linkProgress;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width / globalScale;
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 10 * glowScale(currentTheme());
      if (e.strength === 'weak') ctx.setLineDash([4 / globalScale, 3 / globalScale]);
      // Gentle curvature breaks up the picket-fence effect of parallel
      // straight edges; direction is deterministic per edge id.
      const x1 = sObj.x;
      const y1 = sObj.y ?? 0;
      const x2 = tObj.x;
      const y2 = tObj.y ?? 0;
      let sign = curveSignRef.current.get(e.id);
      if (sign === undefined) {
        sign = edgeCurveSign(e.id);
        curveSignRef.current.set(e.id, sign);
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len > 2) {
        const k = 0.12 * sign;
        ctx.quadraticCurveTo(
          (x1 + x2) / 2 + (-dy / len) * len * k,
          (y1 + y2) / 2 + (dx / len) * len * k,
          x2,
          y2,
        );
      } else {
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.restore();
    };

    const handleKeyDown = (event: React.KeyboardEvent): void => {
      const list = nodesRef.current;
      if (list.length === 0) return;
      const current = focusedRef.current;
      const idx = current === null ? -1 : list.findIndex((n) => n.id === current);

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = list[(idx + 1 + list.length) % list.length];
        if (next) {
          setFocusedId(next.id);
          // fly via handle
          const target = next as unknown as PaintNode;
          const g = graphRef.current;
          if (g && typeof target.x === 'number' && typeof target.y === 'number') {
            g.centerAt(target.x, target.y, 600);
          }
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = list[(idx - 1 + list.length) % list.length];
        if (next) {
          setFocusedId(next.id);
          const target = next as unknown as PaintNode;
          const g = graphRef.current;
          if (g && typeof target.x === 'number' && typeof target.y === 'number') {
            g.centerAt(target.x, target.y, 600);
          }
        }
      } else if (event.key === 'Enter') {
        const node = list.find((n) => n.id === current);
        if (node) callbacksRef.current.onNodeClick(node);
      } else if (event.key === 'e' || event.key === 'E') {
        const node = list.find((n) => n.id === current);
        if (node && callbacksRef.current.onNodeExpand) callbacksRef.current.onNodeExpand(node);
      }
    };

    return (
      <div
        ref={wrapRef}
        role="application"
        tabIndex={0}
        aria-label={`Knowledge universe: ${nodes.length} entities, ${edges.length} connections`}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 outline-none"
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeId="id"
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel={(node) => {
            const n = node as unknown as PaintNode;
            return `${n.name} · ${n.type} · influence ${Math.round(n.influence)}`;
          }}
          linkLabel={(link) => {
            const e = link as unknown as PaintLink;
            return `${e.relation} (${e.strength})`;
          }}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeClick={(node) => {
            callbacksRef.current.onNodeClick(node as unknown as GNode);
          }}
          onLinkClick={(link) => {
            callbacksRef.current.onEdgeClick(link as unknown as GEdge);
          }}
          onNodeHover={(node) => {
            const n = node as unknown as PaintNode | null;
            setHoveredId(n && n.id !== undefined ? String(n.id) : null);
          }}
          onNodeDragEnd={(node) => {
            const n = node as unknown as PaintNode;
            n.fx = n.x;
            n.fy = n.y;
          }}
          onBackgroundClick={() => {
            callbacksRef.current.onBackgroundClick?.();
          }}
          enableZoomPanInteraction={interactive}
          enableNodeDrag={interactive}
          cooldownTime={8000}
          warmupTicks={90}
          onEngineStop={snapshotPositions}
        />

        {/* Category legend — glass pill, keyboard-accessible toggles when
            onCategoryToggle is wired (drives activeCategories above). */}
        <LegendOverlay
          activeCategories={props.activeCategories}
          onCategoryToggle={props.onCategoryToggle}
        />
      </div>
    );
  },
);

/**
 * Category legend overlay (bottom-left glass pill). Rendered as
 * keyboard-accessible toggle buttons when onCategoryToggle is wired;
 * otherwise a static, screen-reader-friendly list.
 */
function LegendOverlay({
  activeCategories,
  onCategoryToggle,
}: {
  activeCategories?: string[] | null;
  onCategoryToggle?: (categoryId: string) => void;
}): React.JSX.Element {
  const isPressed = (id: string): boolean =>
    activeCategories === null ||
    activeCategories === undefined ||
    activeCategories.length === 0 ||
    activeCategories.includes(id);

  return (
    <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
      <div
        role="group"
        aria-label="Node categories"
        className="glass flex !flex-row flex-wrap items-center gap-1.5 !p-2"
      >
        {CATEGORIES.map((c) =>
          onCategoryToggle ? (
            <button
              key={c.id}
              type="button"
              aria-pressed={isPressed(c.id)}
              onClick={() => onCategoryToggle(c.id)}
              className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] text-muted transition-colors hover:text-ink focus-visible:outline-none"
              style={
                isPressed(c.id)
                  ? {
                      borderColor: `var(--cat-${c.id})`,
                      color: `var(--cat-${c.id})`,
                      background: 'rgba(255,255,255,0.04)',
                    }
                  : { borderColor: 'var(--line)' }
              }
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: `var(--cat-${c.id})` }}
              />
              {c.label}
            </button>
          ) : (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[11px] text-muted"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: `var(--cat-${c.id})` }}
              />
              {c.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
