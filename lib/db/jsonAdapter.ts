/**
 * lib/db/jsonAdapter.ts — v1 DbAdapter over JSON files in data/.
 *
 * This is the DEFAULT and the demo-safe path: the demo never depends on a
 * database server. data/world.json + data/snapshots/*.json are COMMITTED to
 * the repo (see .gitignore) so deploys work with zero env vars.
 *
 * Missing-file behavior: getWorld/getSnapshot throw (routes translate to
 * 500/404); the ledger initializes to an in-memory default instead of
 * crashing; log/simulation writes are best-effort.
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCache, setCache } from '../cache';
import type {
  CachedExpansion,
  CreditLedger,
  CreditLogEntry,
  GNode,
  SimulationLog,
  World,
} from '../types';
import type { DbAdapter } from './adapter';

const DATA_DIR = join(process.cwd(), 'data');
const WORLD_PATH = join(DATA_DIR, 'world.json');
const SNAPSHOT_PATH = (year: string) => join(DATA_DIR, 'snapshots', `${year}.json`);
const LEDGER_PATH = join(DATA_DIR, 'credit-ledger.json');
const SIM_LOG_PATH = join(DATA_DIR, 'simulation-log.jsonl');

const DEFAULT_PLAN_LIMIT = 250;

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as unknown;
}

function isWorld(v: unknown): v is World {
  return (
    typeof v === 'object' &&
    v !== null &&
    Array.isArray((v as World).nodes) &&
    Array.isArray((v as World).edges)
  );
}

function isCachedExpansion(v: unknown): v is CachedExpansion {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const rec = v as Record<string, unknown>;
  return Array.isArray(rec.entities) && Array.isArray(rec.relations);
}

function isCreditLogEntry(v: unknown): v is CreditLogEntry {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const rec = v as Record<string, unknown>;
  return (
    typeof rec.at === 'string' &&
    typeof rec.query_hash === 'string' &&
    typeof rec.cached === 'boolean'
  );
}

/**
 * The credit ledger has two on-disk shapes in the wild:
 * 1. Database.md's object form: { planLimit, used, log[] }
 * 2. lib/serpapi.ts's JSONL form: one ledger line per file line
 * getCreditLedger accepts both; recordCreditUse always appends JSONL (2).
 */
function parseLedger(raw: string): CreditLedger {
  const log: CreditLogEntry[] = [];
  let planLimit = DEFAULT_PLAN_LIMIT;
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { planLimit, used: 0, log };
  }
  // Try object form first.
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (Array.isArray(obj.log)) {
      const entries = obj.log.filter(isCreditLogEntry);
      if (typeof obj.planLimit === 'number') {
        planLimit = obj.planLimit;
      }
      const used = typeof obj.used === 'number' ? obj.used : entries.filter((e) => !e.cached).length;
      return { planLimit, used, log: entries };
    }
  } catch {
    // fall through to JSONL parsing
  }
  for (const line of trimmed.split('\n')) {
    try {
      const entry = JSON.parse(line) as unknown;
      if (isCreditLogEntry(entry)) {
        log.push(entry);
      }
    } catch {
      // skip corrupt lines — the ledger must never break the app
    }
  }
  return { planLimit, used: log.filter((e) => !e.cached).length, log };
}

export class JsonAdapter implements DbAdapter {
  async getWorld(): Promise<World> {
    const world = await readJson(WORLD_PATH);
    if (!isWorld(world)) {
      throw new Error('world.json is malformed');
    }
    return world;
  }

  async getSnapshot(year: string): Promise<World> {
    const snap = await readJson(SNAPSHOT_PATH(year));
    if (!isWorld(snap)) {
      throw new Error(`snapshot ${year} is malformed`);
    }
    return snap;
  }

  async getNode(id: string): Promise<GNode | null> {
    try {
      const world = await this.getWorld();
      return world.nodes.find((n) => n.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async getCachedExpansion(queryHash: string): Promise<CachedExpansion | null> {
    const v = await getCache(queryHash);
    return isCachedExpansion(v) ? v : null;
  }

  async saveExpansion(queryHash: string, data: CachedExpansion): Promise<void> {
    await setCache(queryHash, { ...data, cached_at: new Date().toISOString() });
  }

  async logSimulation(entry: SimulationLog): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      await appendFile(SIM_LOG_PATH, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // best effort — audit logging must never break a request
    }
  }

  async getCreditLedger(): Promise<CreditLedger> {
    try {
      return parseLedger(await readFile(LEDGER_PATH, 'utf-8'));
    } catch {
      return { planLimit: DEFAULT_PLAN_LIMIT, used: 0, log: [] };
    }
  }

  async recordCreditUse(entry: CreditLogEntry): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      await appendFile(LEDGER_PATH, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // best effort — ledger writes must never break a request
    }
  }
}
