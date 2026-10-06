/**
 * lib/graphLayout — deterministic, clustered initial layout for the
 * UniverseGraph canvas.
 *
 * The old graph rendered as a hairball because every node started at a
 * random position with default d3 forces. This module computes a deliberate
 * starting arrangement instead:
 *
 * - Nodes are grouped by their v2 semantic category (lib/category.ts).
 * - The 8 category clusters sit on a ring around the origin, each cluster
 *   a tight golden-angle spiral so neighbours stay neighbours.
 * - Tiny connected components (<= 3 nodes, incl. isolated nodes) become
 *   "satellites": parked on an arc below the main ring instead of drifting
 *   off-canvas.
 * - Everything is deterministic (id-hash jitter, no Math.random) so SSR,
 *   tests, and re-renders agree.
 *
 * Pure and side-effect-free: safe to unit test under node.
 */

import { CATEGORIES, categoryOf } from './category';

export interface LayoutNode {
  id: string;
  type: string;
  influence: number;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

export interface PlacedNode {
  x: number;
  y: number;
  /** True when the node belongs to a tiny component parked on the satellite arc. */
  satellite: boolean;
}

/** Ring radius for the 8 category cluster centers (graph units). */
export const CLUSTER_RING_RADIUS = 170;
/** Radius of the satellite arc for tiny components (graph units). */
export const SATELLITE_ARC_RADIUS = 470;
/** Components with this many nodes or fewer are parked as satellites. */
export const SATELLITE_MAX_SIZE = 3;
/** Soft containment radii used by the canvas 'contain' force. */
export const CONTAIN_MAIN_RADIUS = 400;
export const CONTAIN_SATELLITE_RADIUS = 640;

/** Deterministic 0..1 hash from a string (FNV-1a). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Degree (incident edge count) per node id. */
export function computeDegrees(
  nodes: Pick<LayoutNode, 'id'>[],
  edges: LayoutEdge[],
): Map<string, number> {
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const e of edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  return deg;
}

/**
 * Connected components via union-find. Returns an array of components, each
 * a list of node ids. Isolated nodes appear as singletons.
 */
export function findComponents(
  nodes: Pick<LayoutNode, 'id'>[],
  edges: LayoutEdge[],
): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = parent.get(x) ?? x;
    while ((parent.get(root) ?? root) !== root) root = parent.get(root)!;
    // path compression
    let cur = x;
    while ((parent.get(cur) ?? cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const n of nodes) parent.set(n.id, n.id);
  for (const e of edges) {
    if (parent.has(e.source) && parent.has(e.target)) union(e.source, e.target);
  }
  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const r = find(n.id);
    const g = groups.get(r);
    if (g) g.push(n.id);
    else groups.set(r, [n.id]);
  }
  return [...groups.values()];
}

/**
 * Visual radius for a node. Degree-driven (influence in the dataset spans a
 * narrow 55–98 band, so degree discriminates hubs far better).
 */
export function nodeRadius(degree: number): number {
  return 5 + 2.6 * Math.sqrt(Math.max(degree, 0));
}

/**
 * Ids of the `count` most important nodes, for always-on labels.
 * Ranked by influence, ties broken by degree.
 */
export function topLabelIds<T extends LayoutNode>(
  nodes: T[],
  degrees: Map<string, number>,
  count = 12,
): Set<string> {
  return new Set(
    [...nodes]
      .sort((a, b) => {
        if (b.influence !== a.influence) return b.influence - a.influence;
        return (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0);
      })
      .slice(0, count)
      .map((n) => n.id),
  );
}

/** Curve direction for an edge (+1 / -1), from its id hash — deterministic. */
export function edgeCurveSign(edgeId: string): 1 | -1 {
  return hash01(`curve:${edgeId}`) > 0.5 ? 1 : -1;
}

/**
 * Compute initial positions for nodes that don't have any yet.
 * Returns placements for EVERY node, but callers should only apply them to
 * nodes lacking coordinates (settled nodes keep their positions so snapshot
 * swaps and expansions don't teleport the graph).
 *
 * Layout:
 *  1. Components of size <= SATELLITE_MAX_SIZE -> satellite arc below the
 *     ring, spread across 200°–340°, each component a tight mini-cluster.
 *  2. Everyone else -> grouped by category; the 8 category centers sit on a
 *     ring (CATEGORIES order, starting at the top); nodes spiral out from
 *     their cluster center with golden-angle phyllotaxis + id-hash jitter.
 */
export function initializePositions<T extends LayoutNode>(
  nodes: T[],
  edges: LayoutEdge[],
): Map<string, PlacedNode> {
  const out = new Map<string, PlacedNode>();
  if (nodes.length === 0) return out;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const components = findComponents(nodes, edges);
  const satelliteIds = new Set<string>();
  for (const comp of components) {
    if (comp.length <= SATELLITE_MAX_SIZE) {
      for (const id of comp) satelliteIds.add(id);
    }
  }

  // --- Satellites: arc across the lower half of the canvas (canvas y grows
  // downward, so positive sin = visually down). Each component forms its
  // own mini-cluster.
  const satComps = components.filter((c) => c.length <= SATELLITE_MAX_SIZE);
  satComps.forEach((comp, ci) => {
    const t = satComps.length === 1 ? 0.5 : ci / (satComps.length - 1);
    const ang = Math.PI * (0.12 + 0.76 * t); // ~22° .. ~158° (lower half)
    const cx = Math.cos(ang) * SATELLITE_ARC_RADIUS;
    const cy = Math.sin(ang) * SATELLITE_ARC_RADIUS;
    comp.forEach((id, i) => {
      const a = i * 2.39996 + hash01(`sat:${id}`) * 0.6;
      const r = 10 + 16 * Math.sqrt(i);
      out.set(id, {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        satellite: true,
      });
    });
  });

  // --- Main clusters: 8 category centers on a ring, top-first.
  const clusterCenter = new Map<string, { x: number; y: number }>();
  CATEGORIES.forEach((c, k) => {
    const ang = -Math.PI / 2 + (k / CATEGORIES.length) * Math.PI * 2;
    clusterCenter.set(c.id, {
      x: Math.cos(ang) * CLUSTER_RING_RADIUS,
      y: Math.sin(ang) * CLUSTER_RING_RADIUS,
    });
  });

  const perCluster = new Map<string, string[]>();
  for (const n of nodes) {
    if (satelliteIds.has(n.id)) continue;
    const catId = categoryOf(n.type).id;
    const list = perCluster.get(catId);
    if (list) list.push(n.id);
    else perCluster.set(catId, [n.id]);
  }
  // Deterministic within-cluster order: most-connected first so hubs sit
  // at the cluster core.
  const degrees = computeDegrees(nodes, edges);
  for (const [catId, ids] of perCluster) {
    ids.sort((a, b) => {
      const da = degrees.get(a) ?? 0;
      const db = degrees.get(b) ?? 0;
      if (db !== da) return db - da;
      const ia = byId.get(a)?.influence ?? 0;
      const ib = byId.get(b)?.influence ?? 0;
      return ib - ia;
    });
    const center = clusterCenter.get(catId)!;
    ids.forEach((id, i) => {
      const a = i * 2.39996 + hash01(`cl:${id}`) * 0.5;
      const r = 12 + 15 * Math.sqrt(i);
      out.set(id, {
        x: center.x + Math.cos(a) * r,
        y: center.y + Math.sin(a) * r,
        satellite: false,
      });
    });
  }

  return out;
}
