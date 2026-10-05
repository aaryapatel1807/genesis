import { describe, expect, it } from 'vitest';
import { dedupeEdges, dedupeNodes, normalizeName } from '../lib/dedupe';
import type { GEdge, GNode } from '../lib/types';

const node = (id: string, name: string, type: GNode['type'] = 'company'): GNode => ({
  id,
  name,
  type,
  description: 'd',
  influence: 50,
  reality: { confidence: 80, freshness: '2026-01-01', sources: 2 },
  first_seen: '2026',
});

describe('normalizeName', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeName('Open AI')).toBe('openai');
    expect(normalizeName('OpenAI')).toBe('openai');
    expect(normalizeName('AT&T Inc.')).toBe('attinc');
  });
});

describe('dedupeNodes', () => {
  it('merges name variants of the same type (BUG 3 root cause)', () => {
    const existing = [node('n_openai', 'OpenAI')];
    const candidates = [node('n_open_ai', 'Open AI'), node('n_harness', 'Harness Labs', 'startup')];
    const out = dedupeNodes(existing, candidates);
    // "Open AI" is a variant of existing OpenAI -> dropped; Harness kept
    expect(out.map((n) => n.id)).toEqual(['n_harness']);
  });

  it('keeps same name with different type', () => {
    const existing = [node('n_x', 'X', 'company')];
    const out = dedupeNodes(existing, [node('n_y', 'X', 'product')]);
    expect(out).toHaveLength(1);
  });

  it('dedupes within the candidate list, first wins', () => {
    const out = dedupeNodes([], [node('a', 'Foo'), node('b', 'FOO')]);
    expect(out.map((n) => n.id)).toEqual(['a']);
  });
});

describe('dedupeEdges', () => {
  const edge = (id: string, source: string, target: string, relation: GEdge['relation'] = 'partnership'): GEdge => ({
    id, source, target, relation, strength: 'strong',
    evidence: [{ snippet: 's', url: '', engine: 'google', date: '2026-01-01' }],
  });

  it('drops duplicate source|target|relation triples', () => {
    const existing = [edge('e1', 'a', 'b')];
    const out = dedupeEdges(existing, [edge('e2', 'a', 'b'), edge('e3', 'a', 'c')]);
    expect(out.map((e) => e.id)).toEqual(['e3']);
  });

  it('treats different relations as distinct edges', () => {
    const out = dedupeEdges([], [edge('e1', 'a', 'b', 'partnership'), edge('e2', 'a', 'b', 'competes')]);
    expect(out).toHaveLength(2);
  });
});
