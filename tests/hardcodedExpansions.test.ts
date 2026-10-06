import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SELF,
  bespokeCoverage,
  buildHardcodedGraft,
  getHardcodedExpansion,
} from '../lib/agents/hardcodedExpansions';
import { normalizeName } from '../lib/dedupe';
import type { GNode, World } from '../lib/types';

function loadWorld(): World {
  return JSON.parse(readFileSync('data/world.json', 'utf-8')) as World;
}

function fakeNode(partial: Partial<GNode> & { id: string }): GNode {
  return {
    name: 'Future Node',
    type: 'company',
    description: 'synthetic',
    influence: 50,
    reality: { confidence: 70, freshness: '2026-10-01', sources: 1 },
    first_seen: '2026',
    ...partial,
  };
}

describe('hardcoded expansions — coverage', () => {
  it('covers every node in the shipped world', () => {
    const world = loadWorld();
    expect(world.nodes.length).toBeGreaterThan(50);
    const missing = world.nodes.filter((n) => getHardcodedExpansion(n) === null);
    expect(missing.map((n) => n.id)).toEqual([]);
  });

  it('has bespoke expansions for the hub nodes', () => {
    const covered = new Set(bespokeCoverage());
    for (const id of ['n_openai', 'n_nvidia', 'n_usa', 'n_attention_is_all_you_need', 'n_ml_engineer']) {
      expect(covered.has(id)).toBe(true);
    }
  });

  it('does not waste entities on name+type collisions with the world', () => {
    const world = loadWorld();
    const worldKeys = new Set(world.nodes.map((n) => `${normalizeName(n.name)}|${n.type}`));
    const collisions: string[] = [];
    for (const n of world.nodes) {
      const kb = getHardcodedExpansion(n);
      for (const e of kb?.entities ?? []) {
        if (worldKeys.has(`${normalizeName(e.name)}|${e.type}`)) {
          collisions.push(`${n.id} -> ${e.name} (${e.type})`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });
});

describe('hardcoded expansions — graft integrity', () => {
  const hubIds = ['n_openai', 'n_usa', 'n_attention_is_all_you_need', 'n_ml_engineer', 'n_google_transformer_patent'];

  it.each(hubIds)('builds a clean graft for %s', (id) => {
    const world = loadWorld();
    const node = world.nodes.find((n) => n.id === id);
    expect(node).toBeDefined();
    const graft = buildHardcodedGraft(world, node as GNode);
    expect(graft).not.toBeNull();
    expect(graft?.known).toBe(true);
    expect(graft?.addedNodes.length).toBeGreaterThan(0);

    for (const n of graft?.addedNodes ?? []) {
      expect(n.id.startsWith('n_')).toBe(true);
      expect(n.name.length).toBeGreaterThan(0);
      expect(n.description.length).toBeGreaterThan(10);
      expect(n.influence).toBeGreaterThan(0);
    }

    const alive = new Set([...world.nodes, ...(graft?.addedNodes ?? [])].map((n) => n.id));
    for (const e of graft?.addedEdges ?? []) {
      expect(e.source).not.toBe(e.target); // no self-loops
      expect(alive.has(e.source)).toBe(true); // never dangling
      expect(alive.has(e.target)).toBe(true);
      expect(e.evidence.length).toBeGreaterThan(0);
      expect(e.evidence[0].engine).toBe('hardcoded');
      expect(e.evidence[0].url.startsWith('https://')).toBe(true);
    }
    // every entity is wired to the graph
    const wired = new Set((graft?.addedEdges ?? []).flatMap((e) => [e.source, e.target]));
    for (const n of graft?.addedNodes ?? []) {
      expect(wired.has(n.id)).toBe(true);
    }
  });

  it('is deterministic: same node, same graft', () => {
    const world = loadWorld();
    const node = world.nodes.find((n) => n.id === 'n_nvidia') as GNode;
    expect(buildHardcodedGraft(world, node)).toEqual(buildHardcodedGraft(world, node));
  });

  it('re-expansion after merging is a known no-op (no duplicates, no dangling)', () => {
    const world = loadWorld();
    const node = world.nodes.find((n) => n.id === 'n_openai') as GNode;
    const first = buildHardcodedGraft(world, node);
    expect(first?.addedNodes.length).toBeGreaterThan(0);
    const grown: World = {
      ...world,
      nodes: [...world.nodes, ...(first?.addedNodes ?? [])],
      edges: [...world.edges, ...(first?.addedEdges ?? [])],
    };
    const second = buildHardcodedGraft(grown, node);
    expect(second?.known).toBe(true);
    expect(second?.addedNodes).toEqual([]);
    expect(second?.addedEdges).toEqual([]);
  });

  it('falls back to a deterministic type-pool slice for unknown nodes', () => {
    const world = loadWorld();
    const node = fakeNode({ id: 'n_future_corp', name: 'Future Corp', type: 'company' });
    const kb = getHardcodedExpansion(node);
    expect(kb).not.toBeNull();
    expect(kb?.entities).toHaveLength(3);
    // deterministic
    expect(getHardcodedExpansion(node)).toEqual(kb);
    // relations only touch picked entities or $self
    const names = new Set((kb?.entities ?? []).map((e) => e.name));
    for (const r of kb?.relations ?? []) {
      expect(r.source === SELF || names.has(r.source)).toBe(true);
      expect(r.target === SELF || names.has(r.target)).toBe(true);
    }
    const graft = buildHardcodedGraft(world, node);
    expect(graft?.addedNodes.length).toBe(3);
  });
});
