import { describe, expect, it } from 'vitest';
import { GET } from '../app/api/trending/route';

describe('GET /api/trending', () => {
  it('returns six fallback items without a SerpApi key', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      items: { title: string; query: string }[];
      fallback: boolean;
    };
    expect(data.fallback).toBe(true);
    expect(data.items).toHaveLength(6);
    for (const item of data.items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.query.length).toBeGreaterThan(0);
    }
  });
});
