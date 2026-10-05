/**
 * lib/cache.ts — file-backed JSON cache.
 *
 * - Keyed by sha256 hex (see `cacheKey`).
 * - 7-day TTL enforced via file mtime.
 * - LRU eviction: when the cache dir holds more than 200 files, the oldest
 *   (by mtime) are deleted on write.
 * All operations are best-effort: failures resolve to null / no-op.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_DIR = join(process.cwd(), 'data', 'cache');
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FILES = 200;

/** sha256 hex digest of the given string — the canonical cache-key builder. */
export function cacheKey(parts: string): string {
  return createHash('sha256').update(parts).digest('hex');
}

function pathFor(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

export async function getCache(key: string): Promise<unknown | null> {
  try {
    const p = pathFor(key);
    const s = await stat(p);
    if (Date.now() - s.mtimeMs > TTL_MS) {
      await unlink(p).catch(() => undefined);
      return null;
    }
    const raw = await readFile(p, 'utf-8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown): Promise<void> {
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
