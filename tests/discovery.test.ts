import { describe, expect, it } from 'vitest';
import { getDiscoveries, type Discovery } from '../lib/discovery';
import worldJson from '../data/world.json';
import type { GEdge, GNode, NodeType, World } from '../lib/types';

const world = worldJson as unknown as World;

const EMPTY_WORLD: World = {
  meta: {
    topic: 'empty',
    built_at: '',
    node_count: 0,
    edge_count: 0,
    source_count: 0,
  },
  nodes: [],
  edges: [],
};

const NODELESS_EDGES: World = {
  ...EMPTY_WORLD,
  nodes: [
    {
      id: 'n_lonely',
      name: 'Lonely',
      type: 'company',
      description: 'No edges.',
      influence: 1,
      reality: { confidence: 50, freshness: '2026-01-01', sources: 1 },
      first_seen: '2020',
    },
  ],
};

const VALID_TYPES: NodeType[] = [
  'company',
  'researcher',
  'university',
  'product',
  'startup',
  'funder',
  'patent',
  'event',
  'technology',
  'paper',
  'job',
  'country',
  'government',
  'law',
];

function byId(nodes: GNode[]): Map<string, GNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Recompute the dependency insight independently from the fixture. */
function expectedDependency(world: World): { id: string; count: number } | null {
  const ids = byId(world.nodes);
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();
  const companyLinked = new Set<string>();
  for (const e of world.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    const set = dependents.get(e.target) ?? new Set<string>();
    set.add(e.source);
    dependents.set(e.target, set);
    if (ids.get(e.source)?.type === 'company' && ids.get(e.target)?.type !== 'company') {
      companyLinked.add(e.target);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of inDegree) {
    if (companyLinked.has(id) && count > bestCount) {
      bestCount = count;
      best = id;
    }
  }
  if (best === null) return null;
  return { id: best, count: dependents.get(best)?.size ?? bestCount };
}

function findCard(cards: Discovery[], id: string): Discovery {
  const card = cards.find((c) => c.id === id);
  expect(card, `expected card "${id}"`).toBeDefined();
  return card as Discovery;
}

describe('getDiscoveries', () => {
  it('returns 3-5 cards with a valid structure for the real world', () => {
    const cards = getDiscoveries(world);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(cards.length).toBeLessThanOrEqual(5);

    const ids = new Set<string>();
    for (const c of cards) {
      expect(c.id).toMatch(/^[a-z-]+$/);
      expect(ids.has(c.id)).toBe(false); // unique ids
      ids.add(c.id);
      expect(['insight', 'risk', 'trend']).toContain(c.kind);
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.detail.trim().length).toBeGreaterThan(0);
      expect(c.actionLabel.trim().length).toBeGreaterThan(0);
      expect(typeof c.estimated).toBe('boolean');
      const hasNode = 'nodeId' in c.filter;
      const hasCats = 'categories' in c.filter;
      expect(hasNode || hasCats).toBe(true);
      if (hasNode) {
        expect(byId(world.nodes).has((c.filter as { nodeId: string }).nodeId)).toBe(true);
      }
      if (hasCats) {
        const cats = (c.filter as { categories: string[] }).categories ?? [];
        expect(cats.length).toBeGreaterThan(0);
        for (const cat of cats) {
          expect(VALID_TYPES).toContain(cat);
        }
      }
    }
  });

  it('reports the true dependency count — no invented numbers', () => {
    const expected = expectedDependency(world);
    expect(expected).not.toBeNull();
    const card = findCard(getDiscoveries(world), 'dependency');
    expect(card.kind).toBe('insight');
    expect(card.estimated).toBe(false);
    expect(card.title).toContain(String(expected?.count));
    expect(card.title).toContain(byId(world.nodes).get(expected?.id as string)?.name ?? '');
    expect((card.filter as { nodeId: string }).nodeId).toBe(expected?.id);
  });

  it('reports the true 2020->now growth from first_seen — no invented numbers', () => {
    const seen2020 = world.nodes.filter((n) => n.first_seen === '2020').length;
    expect(seen2020).toBeGreaterThan(0);
    const growth = Math.round(((world.nodes.length - seen2020) / seen2020) * 100);
    const card = findCard(getDiscoveries(world), 'growth');
    expect(card.kind).toBe('trend');
    expect(card.estimated).toBe(false);
    expect(card.title).toContain(`${growth}%`);
    expect(card.detail).toContain(String(seen2020));
    expect(card.detail).toContain(String(world.nodes.length));
  });

  it('reports the true funding share and flags it as estimated', () => {
    const ids = byId(world.nodes);
    const fundingEdges = world.edges.filter(
      (e: GEdge) =>
        e.relation === 'investment' ||
        ids.get(e.source)?.type === 'funder' ||
        ids.get(e.target)?.type === 'funder',
    );
    const share = fundingEdges.length / world.edges.length;
    const cards = getDiscoveries(world);
    if (share > 0.1) {
      const card = findCard(cards, 'funding-concentration');
      expect(card.kind).toBe('risk');
      expect(card.estimated).toBe(true);
      const label = String(Number((share * 100).toFixed(1)));
      expect(card.title).toContain(`${label}%`);
      expect(card.detail).toContain(String(fundingEdges.length));
      expect(card.detail).toContain(String(world.edges.length));
    } else {
      expect(cards.find((c) => c.id === 'funding-concentration')).toBeUndefined();
    }
  });

  it('reports the true hub degree and rivalry count — no invented numbers', () => {
    const ids = byId(world.nodes);
    const degree = new Map<string, number>();
    for (const e of world.edges) {
      if (!ids.has(e.source) || !ids.has(e.target)) continue;
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    let hubId = '';
    let hubDegree = 0;
    for (const [id, count] of degree) {
      if (count > hubDegree) {
        hubDegree = count;
        hubId = id;
      }
    }
    const cards = getDiscoveries(world);
    const hub = findCard(cards, 'hub');
    expect(hub.estimated).toBe(false);
    expect(hub.title).toContain(String(hubDegree));
    expect(hub.title).toContain(ids.get(hubId)?.name ?? '');
    expect((hub.filter as { nodeId: string }).nodeId).toBe(hubId);

    const rivalries = world.edges.filter(
      (e) => e.relation === 'competes' && ids.has(e.source) && ids.has(e.target),
    ).length;
    const comp = findCard(cards, 'competition');
    expect(comp.estimated).toBe(false);
    expect(comp.title).toContain(String(rivalries));
  });

  it('handles an empty world gracefully', () => {
    expect(getDiscoveries(EMPTY_WORLD)).toEqual([]);
  });

  it('handles a world with nodes but no edges gracefully', () => {
    expect(getDiscoveries(NODELESS_EDGES)).toEqual([]);
  });
});
