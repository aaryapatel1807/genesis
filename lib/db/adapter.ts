/**
 * lib/db/adapter.ts — the DbAdapter contract.
 *
 * v1 (default, demo-safe): JsonAdapter over data/*.json — zero ops, no server.
 * v2 (multi-user / concurrent writes): PostgresAdapter over db/schema.sql.
 * Callers use lib/db/index.ts's getDb() and never touch an adapter directly.
 */
import type {
  CachedExpansion,
  CreditLedger,
  CreditLogEntry,
  GNode,
  SimulationLog,
  World,
} from '../types';

export interface DbAdapter {
  /** The precomputed universe (v1: data/world.json). Throws if not built. */
  getWorld(): Promise<World>;

  /** Historical snapshot for 2020|2022|2024|2026 (v1: data/snapshots/<year>.json). */
  getSnapshot(year: string): Promise<World>;

  /** Single node by id. Null when the world is missing or the id is unknown. */
  getNode(id: string): Promise<GNode | null>;

  /**
   * Expansion cache, keyed by sha256(query) as produced by lib/cache's
   * cacheKey. Delegates to the same 7-day TTL store lib/cache.ts uses —
   * this must never become a second, competing cache system.
   */
  getCachedExpansion(queryHash: string): Promise<CachedExpansion | null>;
  saveExpansion(queryHash: string, data: CachedExpansion): Promise<void>;

  /** Append-only audit log of simulator runs. Best effort; never throws. */
  logSimulation(entry: SimulationLog): Promise<void>;

  /** SerpApi credit ledger: limit + spend + per-call log. */
  getCreditLedger(): Promise<CreditLedger>;
  recordCreditUse(entry: CreditLogEntry): Promise<void>;
}
