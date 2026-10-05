import { describe, expect, it } from 'vitest';
import { freshnessLabel, influenceFor, scoreNode } from '../lib/score';

describe('scoreNode (Reality Meter math)', () => {
  it('scales 50/65/80/95 with source count, never 100', () => {
    expect(scoreNode(0, '2026-01-01').confidence).toBe(35);
    expect(scoreNode(1, '2026-01-01').confidence).toBe(50);
    expect(scoreNode(2, '2026-01-01').confidence).toBe(65);
    expect(scoreNode(3, '2026-01-01').confidence).toBe(80);
    expect(scoreNode(4, '2026-01-01').confidence).toBe(95);
    expect(scoreNode(99, '2026-01-01').confidence).toBe(95);
  });

  it('passes freshness and sources straight through', () => {
    const r = scoreNode(2, '2026-10-01');
    expect(r.freshness).toBe('2026-10-01');
    expect(r.sources).toBe(2);
  });
});

describe('freshnessLabel', () => {
  it('buckets recency correctly', () => {
    expect(freshnessLabel(0)).toBe('fresh');
    expect(freshnessLabel(30)).toBe('fresh');
    expect(freshnessLabel(31)).toBe('aging');
    expect(freshnessLabel(180)).toBe('aging');
    expect(freshnessLabel(181)).toBe('stale');
  });
});

describe('influenceFor', () => {
  it('stays within 0-100 and rewards source depth', () => {
    const low = influenceFor('company', 0);
    const high = influenceFor('company', 4);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
    expect(high).toBeGreaterThan(low);
    expect(influenceFor('company', 99)).toBeLessThanOrEqual(100);
  });

  it('covers all 14 node types without throwing', () => {
    const types = ['company','researcher','university','product','startup','funder','patent','event','technology','paper','job','country','government','law'] as const;
    for (const t of types) {
      expect(influenceFor(t, 2)).toBeGreaterThan(0);
    }
  });
});
