import { describe, expect, it } from 'vitest';
import { nodeIdFor, slugify } from '../lib/agents/evidence';
import { eraCaption } from '../lib/agents/narrator';
import { planExpansion } from '../lib/agents/planner';
import { rankNodes } from '../lib/agents/ranking';
import { verifyRelations } from '../lib/agents/relationship';
import { sanitizeScenario } from '../lib/agents/simulation';
import type { GNode } from '../lib/types';
import type { ExtractedEntity, ExtractedRelation } from '../lib/agents/explorer';

const node = (id: string, name: string, type: GNode['type'], influence = 50): GNode => ({
  id, name, type, description: 'd', influence,
  reality: { confidence: 80, freshness: '2026-01-01', sources: 2 },
  first_seen: '2026',
});

describe('planner.planExpansion', () => {
  it('returns at most 2 template queries mentioning the node', () => {
    const qs = planExpansion(node('n_x', 'OpenAI', 'company'));
    expect(qs.length).toBeLessThanOrEqual(2);
    expect(qs.every((q) => q.includes('OpenAI'))).toBe(true);
  });

  it('handles every node type without throwing', () => {
    const types: GNode['type'][] = ['company','researcher','university','product','startup','funder','patent','event','technology','paper','job','country','government','law'];
    for (const t of types) {
      expect(planExpansion(node('n', 'X', t)).length).toBeGreaterThan(0);
    }
  });
});

describe('relationship.verifyRelations', () => {
  const ents: ExtractedEntity[] = [
    { name: 'OpenAI', type: 'company', description: 'd' },
    { name: 'Microsoft', type: 'company', description: 'd' },
  ];
  const rel = (source: string, target: string, evidence = 'ev'): ExtractedRelation => ({
    source, target, relation: 'partnership', evidence_snippet: evidence,
  });

  it('drops relations with unknown endpoints', () => {
    expect(verifyRelations([rel('OpenAI', 'Nobody')], ents)).toHaveLength(0);
    expect(verifyRelations([rel('OpenAI', 'Microsoft')], ents)).toHaveLength(1);
  });

  it('matches endpoints by normalized name (name variants OK)', () => {
    expect(verifyRelations([rel('Open AI', 'microsoft')], ents)).toHaveLength(1);
  });

  it('drops self-relations, duplicates, and evidence-less relations', () => {
    expect(verifyRelations([rel('OpenAI', 'OpenAI')], ents)).toHaveLength(0);
    expect(verifyRelations([rel('OpenAI', 'Microsoft'), rel('OpenAI', 'Microsoft')], ents)).toHaveLength(1);
    expect(verifyRelations([rel('OpenAI', 'Microsoft', '')], ents)).toHaveLength(0);
    expect(verifyRelations([rel('OpenAI', 'Microsoft', '   ')], ents)).toHaveLength(0);
  });
});

describe('simulation.sanitizeScenario', () => {
  it('strips angle brackets and caps at 200 chars', () => {
    expect(sanitizeScenario('<script>alert(1)</script>')).not.toContain('<');
    expect(sanitizeScenario('x'.repeat(500)).length).toBe(200);
    expect(sanitizeScenario('  hello  ')).toBe('hello');
  });
});

describe('evidence.nodeIdFor / slugify', () => {
  it('builds stable slug ids', () => {
    expect(nodeIdFor('OpenAI')).toBe('n_openai');
    expect(slugify('Open AI')).toBe('open_ai');
    expect(nodeIdFor('OpenAI')).toBe(nodeIdFor('OpenAI'));
  });
});

describe('ranking.rankNodes', () => {
  it('sorts by influence descending without mutating', () => {
    const nodes = [node('a', 'A', 'company', 10), node('b', 'B', 'company', 90), node('c', 'C', 'company', 50)];
    const ranked = rankNodes(nodes);
    expect(ranked.map((n) => n.id)).toEqual(['b', 'c', 'a']);
    expect(nodes[0].id).toBe('a');
  });
});

describe('narrator.eraCaption', () => {
  it('returns captions for snapshot years and a fallback otherwise', () => {
    expect(eraCaption('2020')).toContain('GPT-3');
    expect(eraCaption('2022')).toContain('generative');
    expect(eraCaption('1999').length).toBeGreaterThan(0);
  });
});
