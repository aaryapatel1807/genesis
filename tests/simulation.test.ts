import { describe, expect, it } from 'vitest';
import {
  findSeedNodes,
  propagateRounds,
  runSimulation,
} from '../lib/agents/simulation';
import { buildPersona, buildPersonas, indexPersonas, react } from '../lib/agents/personas';
import { buildVerdict } from '../lib/agents/verdict';
import type { GEdge, GNode, World } from '../lib/types';

function node(partial: Partial<GNode> & { id: string; name: string }): GNode {
  return {
    type: 'company',
    description: '',
    influence: 50,
    reality: { confidence: 80, freshness: '2026-10-01', sources: 2 },
    first_seen: '2026-10-01',
    ...partial,
  };
}

function edge(id: string, source: string, target: string): GEdge {
  return {
    id,
    source,
    target,
    relation: 'partnership',
    strength: 'strong',
    evidence: [],
  };
}

/** Diamond: n1 hub connected to n2, n3; n4 hangs off n1 via a weak edge. */
function diamondWorld(): World {
  const nodes = [
    node({ id: 'n1', name: 'OpenAI', description: 'AI lab building frontier models', influence: 95, reality: { confidence: 90, freshness: '2026-10-01', sources: 5 } }),
    node({ id: 'n2', name: 'Microsoft', description: 'Cloud giant, OpenAI partner', influence: 88, reality: { confidence: 85, freshness: '2026-10-01', sources: 4 } }),
    node({ id: 'n3', name: 'Anthropic', description: 'AI safety lab', influence: 80, reality: { confidence: 80, freshness: '2026-10-01', sources: 3 } }),
    node({ id: 'n4', name: 'GPU Cluster', type: 'technology', description: 'Compute hardware', influence: 30, reality: { confidence: 60, freshness: '2026-10-01', sources: 1 } }),
  ];
  const edges = [
    { ...edge('e1', 'n1', 'n2'), relation: 'partnership' as const, strength: 'strong' as const },
    { ...edge('e2', 'n1', 'n3'), relation: 'competes' as const, strength: 'medium' as const },
    { ...edge('e3', 'n4', 'n1'), relation: 'powers' as const, strength: 'weak' as const },
  ];
  return {
    meta: { topic: 'test', built_at: '2026-10-06', node_count: 4, edge_count: 3, source_count: 1 },
    nodes,
    edges,
  };
}

describe('simulation.findSeedNodes', () => {
  it('matches scenario keywords against node names first', () => {
    const world = diamondWorld();
    const seeds = findSeedNodes('What if OpenAI raises API prices?', world);
    expect(seeds[0]).toBe('n1');
  });

  it('falls back to top-influence hubs when nothing matches', () => {
    const world = diamondWorld();
    const seeds = findSeedNodes('What if quantum toasters take over?', world);
    expect(seeds).toEqual(['n1', 'n2', 'n3']);
  });

  it('is deterministic and respects maxSeeds', () => {
    const world = diamondWorld();
    const a = findSeedNodes('AI lab funding', world);
    const b = findSeedNodes('AI lab funding', world);
    expect(a).toEqual(b);
    expect(findSeedNodes('AI lab funding', world, 1)).toHaveLength(1);
  });
});

describe('personas', () => {
  it('builds a complete persona for every node type', () => {
    const types = [
      'company', 'researcher', 'university', 'product', 'startup', 'funder',
      'patent', 'event', 'technology', 'paper', 'job', 'country', 'government', 'law',
    ] as const;
    for (const type of types) {
      const p = buildPersona(node({ id: `x-${type}`, name: `Test ${type}`, type }));
      expect(p.nodeId).toBe(`x-${type}`);
      expect(p.bio.length).toBeGreaterThan(0);
      expect(p.traits).toHaveLength(3);
      expect(p.stance.length).toBeGreaterThan(0);
      expect(p.influenceWeight).toBeGreaterThanOrEqual(0);
      expect(p.influenceWeight).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(p.activityLevel);
    }
  });

  it('is deterministic: same node in, same persona out', () => {
    const n = node({ id: 'n1', name: 'OpenAI', influence: 95 });
    expect(buildPersona(n)).toEqual(buildPersona(n));
  });

  it('buckets activity by influence and normalises the weight', () => {
    expect(buildPersona(node({ id: 'a', name: 'A', influence: 95 })).activityLevel).toBe('high');
    expect(buildPersona(node({ id: 'b', name: 'B', influence: 50 })).activityLevel).toBe('medium');
    expect(buildPersona(node({ id: 'c', name: 'C', influence: 10 })).activityLevel).toBe('low');
    expect(buildPersona(node({ id: 'd', name: 'D', influence: 95 })).influenceWeight).toBe(0.95);
  });

  it('react() always returns a voiced, non-empty line', () => {
    const world = diamondWorld();
    const personas = buildPersonas(world);
    for (const p of personas) {
      const line = react(p, 'some effect');
      expect(line.length).toBeGreaterThan(0);
      expect(line.startsWith(p.voice)).toBe(true);
    }
    expect(indexPersonas(personas).get('n1')?.name).toBe('OpenAI');
  });
});

describe('simulation.propagateRounds', () => {
  it('puts seeds in round 1 and waves along real edges only', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const rounds = propagateRounds('x', world, ['n1'], personas);

    const round1 = rounds.filter((r) => r.round === 1);
    expect(round1.map((r) => r.nodeId)).toEqual(['n1']);
    expect(round1[0].viaRelation).toBeNull();
    expect(round1[0].severity).toBe('critical'); // influence 95

    // Every later entry must be a neighbour of an earlier-round node.
    const seenByRound = new Map<number, Set<string>>();
    for (const r of rounds) {
      const s = seenByRound.get(r.round) ?? new Set<string>();
      s.add(r.nodeId);
      seenByRound.set(r.round, s);
    }
    const neighbourOf = (id: string): Set<string> => {
      const out = new Set<string>();
      for (const e of world.edges) {
        if (e.source === id) out.add(e.target);
        if (e.target === id) out.add(e.source);
      }
      return out;
    };
    for (const r of rounds.filter((x) => x.round > 1)) {
      const earlier = new Set<string>();
      for (const [round, ids] of seenByRound) {
        if (round < r.round) for (const id of ids) earlier.add(id);
      }
      const viaOk = [...neighbourOf(r.nodeId)].some((n) => earlier.has(n));
      expect(viaOk).toBe(true);
      expect(r.viaRelation).not.toBeNull();
    }
  });

  it('decays severity with distance and edge strength', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const rounds = propagateRounds('x', world, ['n1'], personas);
    const sev = new Map(rounds.map((r) => [r.nodeId, r.severity]));
    // strong edge keeps critical; medium drops one; weak drops two
    expect(sev.get('n2')).toBe('critical');
    expect(sev.get('n3')).toBe('high');
    expect(sev.get('n4')).toBe('medium');
  });

  it('never visits a node twice and is deterministic', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const a = propagateRounds('x', world, ['n1'], personas);
    const b = propagateRounds('x', world, ['n1'], personas);
    expect(a).toEqual(b);
    const ids = a.map((r) => r.nodeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops unknown seed ids (anti-hallucination)', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const rounds = propagateRounds('x', world, ['nope', 'n1'], personas);
    expect(rounds.every((r) => r.nodeId !== 'nope')).toBe(true);
    expect(rounds.length).toBeGreaterThan(0);
  });

  it('gives every round entry a persona reaction', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const rounds = propagateRounds('x', world, ['n1'], personas);
    for (const r of rounds) {
      expect(r.reaction.length).toBeGreaterThan(0);
      expect(r.nodeName.length).toBeGreaterThan(0);
    }
  });
});

describe('verdict.buildVerdict', () => {
  it('grounds confidence in real evidence and bounds the scores', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const rounds = propagateRounds('x', world, ['n1'], personas);
    const v = buildVerdict('What if OpenAI raises prices?', world, rounds);

    expect(v.isSimulation).toBe(true);
    expect(v.probability).toBeGreaterThanOrEqual(0);
    expect(v.probability).toBeLessThanOrEqual(0.95);
    expect(v.confidence).toBeGreaterThanOrEqual(0);
    expect(v.confidence).toBeLessThanOrEqual(1);
    // mean of 90, 85, 80, 60 → 78.75 → 0.79
    expect(v.confidence).toBeCloseTo(0.79, 2);
    expect(v.signals.length).toBeGreaterThan(0);
    expect(v.forecast).toContain('4 entities');
    expect(v.narratives).toHaveLength(v.rounds);
    expect(v.spread).toBe(1);
  });

  it('is deterministic', () => {
    const world = diamondWorld();
    const personas = indexPersonas(buildPersonas(world));
    const rounds = propagateRounds('x', world, ['n1'], personas);
    expect(buildVerdict('s', world, rounds)).toEqual(buildVerdict('s', world, rounds));
  });
});

describe('simulation.runSimulation (no-key integration)', () => {
  it('returns the full multi-round result deterministically', async () => {
    const world = diamondWorld();
    const a = await runSimulation('What if OpenAI raises API prices?', world);
    const b = await runSimulation('What if OpenAI raises API prices?', world);

    expect(a.isSimulation).toBe(true);
    expect(a.affected).toContain('n1');
    expect(a.rounds.length).toBeGreaterThan(0);
    expect(a.rounds[0].round).toBe(1);
    expect(a.cascades).toHaveLength(a.rounds.length);
    expect(a.personas.map((p) => p.nodeId).sort()).toEqual([...a.affected].sort());
    expect(a.verdict.isSimulation).toBe(true);
    expect(a).toEqual(b);
  });
});
