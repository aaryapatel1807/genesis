/**
 * lib/cache.ts — two-level JSON cache.
 *
 * L1: in-memory Map (survives warm serverless invocations — this is what
 * makes repeat questions instant on Vercel, whose filesystem is read-only
 * outside /tmp).
 * L2: file-backed JSON in data/cache (local dev + 7-day TTL via mtime).
 *
 * - Keyed by sha256 hex (see `cacheKey`).
 * - 7-day TTL on both levels.
 * - LRU eviction on the file level: when the cache dir holds more than 200
 *   files, the oldest (by mtime) are deleted on write.
 * All operations are best-effort: failures resolve to null / no-op.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_DIR = join(process.cwd(), 'data', 'cache');
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FILES = 200;

/** L1: warm-instance memory. Module state persists across invocations. */
const mem = new Map<string, { v: unknown; exp: number }>();

/** sha256 hex digest of the given string — the canonical cache-key builder. */
export function cacheKey(parts: string): string {
  return createHash('sha256').update(parts).digest('hex');
}

function pathFor(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

export async function getCache(key: string): Promise<unknown | null> {
  const m = mem.get(key);
  if (m) {
    if (Date.now() < m.exp) return m.v;
    mem.delete(key);
  }
  try {
    const p = pathFor(key);
    const s = await stat(p);
    if (Date.now() - s.mtimeMs > TTL_MS) {
      await unlink(p).catch(() => undefined);
      return null;
    }
    const raw = await readFile(p, 'utf-8');
    const v = JSON.parse(raw) as unknown;
    mem.set(key, { v, exp: Date.now() + TTL_MS }); // warm the L1
    return v;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown): Promise<void> {
  mem.set(key, { v: value, exp: Date.now() + TTL_MS });
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(pathFor(key), JSON.stringify(value), 'utf-8');
    const files = await readdir(CACHE_DIR);
    if (files.length > MAX_FILES) {
      const withMtime = await Promise.all(
        files.map(async (f) => {
          try {
            const s = await stat(join(CACHE_DIR, f));
            return { f, m: s.mtimeMs };
          } catch {
            return { f, m: 0 };
          }
        })
      );
      withMtime.sort((a, b) => a.m - b.m);
      const excess = withMtime.slice(0, withMtime.length - MAX_FILES);
      await Promise.all(excess.map(({ f }) => unlink(join(CACHE_DIR, f)).catch(() => undefined)));
    }
  } catch {
    // best effort — caching must never break the pipeline
  }
}
