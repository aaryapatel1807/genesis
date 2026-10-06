/**
 * lib/discovery.ts — the discovery engine.
 *
 * Pure, deterministic insight cards computed from the world graph.
 * Every number traces exactly to the supplied World (data/world.json);
 * heuristic cards are flagged with `estimated: true` so the UI can
 * label them as heuristic rather than fact.
 *
 * NOTE: the brief named the input type `WorldData`; no such type exists in
 * lib/types.ts — the real canonical type is `World`, which is what this
 * module takes.
 */

import type { NodeType, World } from './types';

export interface Discovery {
  id: string;
  kind: 'insight' | 'risk' | 'trend';
  title: string;
  detail: string;
  actionLabel: string;
  filter: { categories?: string[] } | { nodeId: string };
  estimated: boolean;
}

/** Share of funding-touching edges above which a concentration risk card fires. */
const FUNDING_RISK_THRESHOLD = 0.1;

const FUNDING_CATEGORIES: NodeType[] = ['funder', 'startup'];

function isFundingEdge(
  e: { source: string; target: string; relation: string },
  typeOf: (id: string) => NodeType | undefined,
): boolean {
  return (
    e.relation === 'investment' ||
    typeOf(e.source) === 'funder' ||
    typeOf(e.target) === 'funder'
  );
}

function pct(share: number): string {
  // 0.125 -> "12.5"; 0.5 -> "50" (no invented precision)
  return String(Number((share * 100).toFixed(1)));
}

export function getDiscoveries(world: World): Discovery[] {
  const nodes = world.nodes ?? [];
  const edges = world.edges ?? [];
  if (nodes.length === 0 || edges.length === 0) return [];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const typeOf = (id: string): NodeType | undefined => byId.get(id)?.type;
  const cards: Discovery[] = [];

  /* 1 — Dependency insight: the non-company entity with the highest in-degree
     that companies link to (supplier / dataset / technology pattern). */
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>(); // target -> distinct source ids
  const companyLinked = new Set<string>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    let set = dependents.get(e.target);
    if (!set) {
      set = new Set<string>();
      dependents.set(e.target, set);
    }
    set.add(e.source);
    if (typeOf(e.source) === 'company' && typeOf(e.target) !== 'company') {
      companyLinked.add(e.target);
    }
  }

  let depId: string | null = null;
  let depCount = 0;
  for (const [id, count] of inDegree) {
    if (companyLinked.has(id) && count > depCount) {
      depCount = count;
      depId = id;
    }
  }
  if (depId !== null) {
    const node = byId.get(depId);
    if (node) {
      const entityCount = dependents.get(depId)?.size ?? depCount;
      cards.push({
        id: 'dependency',
        kind: 'insight',
        title: `${entityCount} entities depend on ${node.name}`,
        detail: `The most depended-upon ${node.type} in the graph — companies link to it directly, and ${depCount} relations in total point at it.`,
        actionLabel: 'Inspect entity',
        filter: { nodeId: depId },
        estimated: false,
      });
    }
  }

  /* 2 — Growth trend: entity births (first_seen) 2020 -> now, exact counts. */
  const seen2020 = nodes.filter((n) => n.first_seen === '2020').length;
  if (seen2020 > 0) {
    const growth = Math.round(((nodes.length - seen2020) / seen2020) * 100);
    cards.push({
      id: 'growth',
      kind: 'trend',
      title: `The world grew ${growth}% since 2020`,
      detail: `${seen2020} entities were first seen in 2020; the world holds ${nodes.length} today.`,
      actionLabel: 'Explore growth',
      filter: { categories: ['company', 'startup', 'product', 'technology'] },
      estimated: false,
    });
  }

  /* 3 — Funding concentration risk: share of edges touching funders or
     investment relations. Heuristic classification -> estimated: true. */
  const fundingEdges = edges.filter((e) => isFundingEdge(e, typeOf));
  const share = fundingEdges.length / edges.length;
  if (share > FUNDING_RISK_THRESHOLD) {
    cards.push({
      id: 'funding-concentration',
      kind: 'risk',
      title: `${pct(share)}% of relations involve funding`,
      detail: `${fundingEdges.length} of ${edges.length} relations touch funders or investment edges — capital flow is a concentration risk in this world.`,
      actionLabel: 'Explore funding',
      filter: { categories: [...FUNDING_CATEGORIES] },
      estimated: true,
    });
  }

  /* 4 — Hub insight: the single most connected entity overall. */
  const degree = new Map<string, number>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  let hubId: string | null = null;
  let hubDegree = 0;
  for (const [id, count] of degree) {
    if (count > hubDegree) {
      hubDegree = count;
      hubId = id;
    }
  }
  if (hubId !== null) {
    const node = byId.get(hubId);
    if (node) {
      cards.push({
        id: 'hub',
        kind: 'insight',
        title: `${node.name} anchors ${hubDegree} relations`,
        detail: `The most connected entity in the graph — ${hubDegree} incoming and outgoing relations.`,
        actionLabel: 'Inspect entity',
        filter: { nodeId: hubId },
        estimated: false,
      });
    }
  }

  /* 5 — Competition insight: head-to-head rivalries mapped in the graph. */
  const rivalries = edges.filter(
    (e) => e.relation === 'competes' && byId.has(e.source) && byId.has(e.target),
  ).length;
  if (rivalries > 0) {
    cards.push({
      id: 'competition',
      kind: 'insight',
      title: `${rivalries} head-to-head rivalries mapped`,
      detail: `${rivalries} compete relations trace the market's battle lines — who is racing whom.`,
      actionLabel: 'Explore rivals',
      filter: { categories: ['company'] },
      estimated: false,
    });
  }

  return cards;
}
