'use client';

import {
  forwardRef,
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
  NODE_COLORS,
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
}

export interface UniverseGraphHandle {
  flyTo: (nodeId: string) => void;
  /** Cinematic camera descent used by the generation sequence. */
  introZoom: () => void;
}

type Shape = 'circle' | 'square' | 'diamond' | 'triangle' | 'star';

function shapeOf(type: NodeType): Shape {
  if (type === 'university' || type === 'government' || type === 'country')
    return 'square';
  if (type === 'product' || type === 'paper') return 'diamond';
  if (type === 'patent' || type === 'law') return 'triangle';
  if (type === 'event') return 'star';
  return 'circle';
}

const EDGE_TOKEN: Record<Strength, { token: string; fallback: string; alpha: number; width: number }> = {
  strong: { token: '--n-startup', fallback: '#4ade80', alpha: 0.6, width: 2.5 },
  medium: { token: '--gold', fallback: '#f5b942', alpha: 0.5, width: 1.75 },
  weak: { token: '--red', fallback: '#ef4444', alpha: 0.35, width: 1 },
};

const edgeColorCache = new Map<string, string>();

/**
 * Edge colors resolve from the design tokens (globals.css) so the canvas
 * never carries hardcoded hex — one cache per token, SSR-safe fallback.
 */
function edgeStyle(strength: Strength): { color: string; alpha: number; width: number } {
  const spec = EDGE_TOKEN[strength] ?? EDGE_TOKEN.medium;
  let color = edgeColorCache.get(spec.token);
  if (!color) {
    color = spec.fallback;
    if (typeof document !== 'undefined') {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(spec.token)
        .trim();
      if (v) color = v;
    }
    edgeColorCache.set(spec.token, color);
  }
  return { color, alpha: spec.alpha, width: spec.width };
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

function drawShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  shape: Shape,
): void {
  ctx.beginPath();
  switch (shape) {
    case 'square':
      ctx.rect(x - r, y - r, r * 2, r * 2);
      break;
    case 'diamond':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r * 0.9);
      ctx.lineTo(x - r, y + r * 0.9);
      ctx.closePath();
      break;
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
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

    // Repaint loop while bloom or simulation pulse is active.
    useEffect(() => {
      if (!bloomActive && pulsing.size === 0) return;
      let raf = 0;
      const loop = (): void => {
        graphRef.current?.refresh();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [bloomActive, pulsing]);

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

    const graphData = useMemo(
      () => ({
        nodes: nodes as ForceGraphNode[],
        links: edges.map((e) => ({ ...e }) as unknown as ForceGraphLink),
      }),
      [nodes, edges],
    );

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
      const color = NODE_COLORS[n.type] ?? '#e8edf4';
      const isDimmed = dimmedRef.current.has(id);
      const isPulsing = pulsingRef.current.has(id);
      const isHot = hoveredRef.current === id || focusedRef.current === id;
      const reduced = reducedMotionRef.current;

      // Bloom progress (staggered per node, eased)
      const now = performance.now();
      const progress = bloomProgress(id, now);

      const baseR = 3 + Math.sqrt(Math.max(n.influence, 0));
      const r = baseR * (0.5 + 0.5 * progress) * (isHot ? 1.15 : 1);

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.15 : progress;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      drawShape(ctx, n.x, n.y, Math.max(r, 0.5), shapeOf(n.type));
      ctx.fill();
      ctx.restore();

      // Simulation pulse: oscillating gold ring (static ring if reduced motion)
      if (isPulsing && !isDimmed) {
        const phase = reduced ? 1 : Math.sin(now / 300);
        const ringR = r + 5 + (reduced ? 0 : 2 * phase);
        ctx.save();
        ctx.globalAlpha = reduced ? 0.9 : 0.5 + 0.4 * phase;
        ctx.strokeStyle = '#f5b942';
        ctx.lineWidth = 2 / globalScale;
        ctx.shadowColor = '#f5b942';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Labels: JetBrains Mono with dark halo, on hover/keyboard focus or zoom
      if ((isHot || globalScale > 1.6) && progress > 0.8 && !isDimmed) {
        const fontSize = 12 / globalScale;
        ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ly = n.y + r + 4 / globalScale;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = 'rgba(5,7,12,0.9)';
        ctx.strokeText(n.name, n.x, ly);
        ctx.fillStyle = '#eef2f8';
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
      ctx.shadowBlur = 10;
      if (e.strength === 'weak') ctx.setLineDash([4 / globalScale, 3 / globalScale]);
      ctx.beginPath();
      ctx.moveTo(sObj.x, sObj.y ?? 0);
      ctx.lineTo(tObj.x, tObj.y ?? 0);
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
          warmupTicks={40}
        />
      </div>
    );
  },
);
