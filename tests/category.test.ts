import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryOf } from '@/lib/category';

/**
 * The 14 real entity types in data/world.json and the category each one
 * is expected to map onto. This table is the contract: if the world data
 * gains a new type, this test must be updated deliberately.
 */
const EXPECTED: Record<string, string> = {
  company: 'companies',
  startup: 'companies',
  university: 'research',
  paper: 'research',
  technology: 'research',
  patent: 'research',
  researcher: 'people',
  product: 'products',
  funder: 'funding',
  event: 'news',
  country: 'government',
  government: 'government',
  law: 'government',
  job: 'other',
};

describe('categoryOf', () => {
  it('maps all 14 real world entity types to their categories', () => {
    expect(Object.keys(EXPECTED)).toHaveLength(14);
    for (const [type, categoryId] of Object.entries(EXPECTED)) {
      expect(categoryOf(type).id).toBe(categoryId);
    }
  });

  it('resolves to the matching CATEGORIES entry (label + color)', () => {
    for (const type of Object.keys(EXPECTED)) {
      const cat = categoryOf(type);
      const entry = CATEGORIES.find((c) => c.id === cat.id);
      expect(entry).toBeDefined();
      expect(cat.label).toBe(entry?.label);
      expect(cat.color).toBe(entry?.color);
    }
  });

  it('falls back to Other for unknown types instead of throwing', () => {
    const unknowns = [
      'dataset',
      'tool',
      'benchmark',
      'insight',
      'funding_round',
      '',
      'alien',
    ];
    for (const unknown of unknowns) {
      const cat = categoryOf(unknown);
      expect(cat.id).toBe('other');
      expect(cat.label).toBe('Other');
      expect(cat.color).toBe(
        CATEGORIES.find((c) => c.id === 'other')?.color,
      );
    }
  });

  it('never returns undefined for any string input', () => {
    for (const type of [...Object.keys(EXPECTED), 'x', 'COMPANY', ' Company']) {
      const cat = categoryOf(type);
      expect(cat).toBeDefined();
      expect(typeof cat.id).toBe('string');
      expect(CATEGORIES.some((c) => c.id === cat.id)).toBe(true);
    }
  });
});

describe('CATEGORIES', () => {
  it('defines exactly 8 categories with unique ids', () => {
    expect(CATEGORIES).toHaveLength(8);
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toEqual([
      'companies',
      'research',
      'people',
      'products',
      'funding',
      'news',
      'government',
      'other',
    ]);
  });

  it('gives every category a non-empty label and a valid hex color', () => {
    for (const c of CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
