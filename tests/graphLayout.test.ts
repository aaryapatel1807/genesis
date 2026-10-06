import { describe, expect, it } from 'vitest';
import {
  CLUSTER_RING_RADIUS,
  CONTAIN_MAIN_RADIUS,
  CONTAIN_SATELLITE_RADIUS,
  edgeCurveSign,
  findComponents,
  hash01,
  initializePositions,
  nodeRadius,
  SATELLITE_ARC_RADIUS,
  topLabelIds,
  type LayoutEdge,
  type LayoutNode,
} from '@/lib/graphLayout';

const N = (id: string, type = 'company', influence = 70): LayoutNode => ({
  id,
  type,
  influence,
});
const E = (id: string, source: string, target: string): LayoutEdge => ({
  id,
  source,
  target,
});

describe('hash01', () => {
  it('is deterministic and bounded', () => {
    expect(hash01('n_openai')).toBe(hash01('n_openai'));
    expect(hash01('n_openai')).toBeGreaterThanOrEqual(0);
    expect(hash01('n_openai')).toBeLessThan(1);
    expect(hash01('a')).not.toBe(hash01('b'));
  });
});

describe('findComponents', () => {
  it('groups linked nodes and isolates singletons', () => {
    const nodes = [N('a'), N('b'), N('c'), N('d')];
    const edges = [E('e1', 'a', 'b'), E('e2', 'b', 'c')];
    const comps = findComponents(nodes, edges);
    expect(comps).toHaveLength(2);
    const big = comps.find((c) => c.includes('a'))!;
    expect(big.sort()).toEqual(['a', 'b', 'c']);
    expect(comps.find((c) => c.includes('d'))).toEqual(['d']);
  });

  it('ignores edges referencing unknown nodes', () => {
    const comps = findComponents([N('a')], [E('e1', 'a', 'ghost')]);
    expect(comps).toEqual([['a']]);
  });
});

describe('nodeRadius', () => {
  it('grows monotonically with degree and stays sane', () => {
    expect(nodeRadius(0)).toBeGreaterThanOrEqual(5);
    expect(nodeRadius(28)).toBeGreaterThan(nodeRadius(3));
    expect(nodeRadius(28)).toBeLessThan(30);
  });
});

describe('topLabelIds', () => {
  it('picks the highest-influence nodes, breaking ties by degree', () => {
    const nodes = [
      N('low', 'company', 55),
      N('mid', 'company', 80),
      N('high', 'company', 98),
    ];
    const degrees = new Map([
      ['low', 20],
      ['mid', 1],
      ['high', 5],
    ]);
    const top = topLabelIds(nodes, degrees, 2);
    expect(top.has('high')).toBe(true);
    expect(top.has('mid')).toBe(true);
    expect(top.has('low')).toBe(false);
  });
});

describe('edgeCurveSign', () => {
  it('is deterministic and only ever ±1', () => {
    const s = edgeCurveSign('e_1');
    expect([1, -1]).toContain(s);
    expect(edgeCurveSign('e_1')).toBe(s);
  });
});

describe('initializePositions', () => {
  it('places category clusters on a ring around the origin', () => {
    // 16 nodes, 2 per category, all linked into one component.
    const nodes: LayoutNode[] = [];
    const edges: LayoutEdge[] = [];
    const types = [
      'company',
      'researcher',
      'product',
      'paper',
      'funder',
      'event',
      'country',
      'job',
    ];
    types.forEach((t, i) => {
      nodes.push(N(`n${i}a`, t), N(`n${i}b`, t));
      edges.push(E(`e${i}`, `n${i}a`, `n${i}b`));
    });
    // Chain the pairs into one component so nothing becomes a satellite.
    for (let i = 0; i < types.length - 1; i++) {
      edges.push(E(`chain${i}`, `n${i}a`, `n${i + 1}a`));
    }
    const pos = initializePositions(nodes, edges);
    expect(pos.size).toBe(16);
    for (const p of pos.values()) expect(p.satellite).toBe(false);

    // Cluster centroids should sit near the ring radius.
    const byCat = new Map<string, { x: number; y: number; n: number }>();
    for (const n of nodes) {
      const p = pos.get(n.id)!;
      const key = t_of(n);
      const acc = byCat.get(key) ?? { x: 0, y: 0, n: 0 };
      acc.x += p.x;
      acc.y += p.y;
      acc.n += 1;
      byCat.set(key, acc);
    }
    expect(byCat.size).toBe(8);
    for (const acc of byCat.values()) {
      const r = Math.hypot(acc.x / acc.n, acc.y / acc.n);
      expect(r).toBeGreaterThan(CLUSTER_RING_RADIUS - 60);
      expect(r).toBeLessThan(CLUSTER_RING_RADIUS + 60);
    }
    // The 8 centroids should be angularly spread (no two within 20°).
    const angs = [...byCat.values()]
      .map((a) => Math.atan2(a.y / a.n, a.x / a.n))
      .sort((a, b) => a - b);
    for (let i = 0; i < angs.length; i++) {
      const a = angs[i]!;
      const b = angs[(i + 1) % angs.length]!;
      let gap = b - a;
      if (gap < 0) gap += Math.PI * 2;
      expect(gap).toBeGreaterThan((20 * Math.PI) / 180);
    }
  });

  it('parks tiny components on the satellite arc', () => {
    const nodes = [N('hub', 'company', 98), N('s1', 'product'), N('s2', 'product')];
    const edges = [E('e1', 'hub', 's1'), E('e2', 's1', 's2')];
    // hub alone in main component of 1? No: hub-s1-s2 is one component of 3 -> satellite.
    const pos = initializePositions(nodes, edges);
    for (const p of pos.values()) expect(p.satellite).toBe(true);
    for (const p of pos.values()) {
      const r = Math.hypot(p.x, p.y);
      expect(r).toBeGreaterThan(SATELLITE_ARC_RADIUS - 80);
      expect(r).toBeLessThan(SATELLITE_ARC_RADIUS + 80);
      // Lower half of the canvas (positive y).
      expect(p.y).toBeGreaterThan(0);
    }
  });

  it('is deterministic across calls', () => {
    const nodes = [N('a', 'company'), N('b', 'researcher'), N('c', 'product')];
    const edges = [E('e1', 'a', 'b'), E('e2', 'b', 'c'), E('e3', 'a', 'c')];
    const p1 = initializePositions(nodes, edges);
    const p2 = initializePositions(nodes, edges);
    for (const n of nodes) {
      expect(p2.get(n.id)).toEqual(p1.get(n.id));
    }
  });

  it('keeps main nodes inside the containment radius', () => {
    const nodes: LayoutNode[] = [];
    for (let i = 0; i < 40; i++) nodes.push(N(`c${i}`, 'company'));
    const edges: LayoutEdge[] = [];
    for (let i = 0; i < 39; i++) edges.push(E(`e${i}`, `c${i}`, `c${i + 1}`));
    const pos = initializePositions(nodes, edges);
    for (const p of pos.values()) {
      expect(Math.hypot(p.x, p.y)).toBeLessThan(CONTAIN_MAIN_RADIUS);
    }
  });

  it('satellites stay inside the satellite containment radius', () => {
    const nodes = [N('a'), N('b')];
    const pos = initializePositions(nodes, [E('e1', 'a', 'b')]);
    for (const p of pos.values()) {
      expect(Math.hypot(p.x, p.y)).toBeLessThan(CONTAIN_SATELLITE_RADIUS);
    }
  });
});

// helper: map test type -> category bucket used for centroid grouping
function t_of(n: LayoutNode): string {
  return (
    {
      company: 'companies',
      researcher: 'people',
      product: 'products',
      paper: 'research',
      funder: 'funding',
      event: 'news',
      country: 'government',
      job: 'other',
    } as Record<string, string>
  )[n.type]!;
}
