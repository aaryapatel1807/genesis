import { describe, expect, it } from 'vitest';
import { cacheKey, getCache, setCache } from '../lib/cache';

describe('cacheKey', () => {
  it('is a deterministic 64-char sha256 hex', () => {
    const a = cacheKey('hello');
    const b = cacheKey('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(cacheKey('hello')).not.toBe(cacheKey('world'));
  });
});

describe('getCache/setCache', () => {
  it('round-trips a value', async () => {
    const key = cacheKey(`vitest-roundtrip-${Date.now()}`);
    await setCache(key, { hello: 'world' });
    expect(await getCache(key)).toEqual({ hello: 'world' });
  });

  it('returns null for a missing key', async () => {
    expect(await getCache(cacheKey(`vitest-missing-${Date.now()}`))).toBeNull();
  });
});
