/**
 * lib/db/postgresAdapter.ts — v2 DbAdapter skeleton over Postgres (db/schema.sql).
 *
 * This is NOT the active adapter: the default is the JsonAdapter (zero ops,
 * demo-safe). Postgres becomes relevant for multi-user deployments with
 * concurrent writes.
 *
 * Activate with: DB_ADAPTER=postgres DATABASE_URL=postgres://… npx next start
 * (after running db/migrations/001_init.sql once).
 *
 * To avoid any build or cold-start risk, this skeleton performs NO top-level
 * connection attempts and bundles NO database driver. Every method throws a
 * clear error until the v2 SQL implementation lands. The error message is
 * intentionally greppable so routes can degrade gracefully.
 */
import type {
  CachedExpansion,
  CreditLedger,
  CreditLogEntry,
  GNode,
  SimulationLog,
  World,
} from '../types';
import type { DbAdapter } from './adapter';

export const POSTGRES_NOT_CONFIGURED =
  'Postgres adapter not configured: set DATABASE_URL and DB_ADAPTER=postgres';

export class PostgresAdapter implements DbAdapter {
  constructor(private readonly connectionString: string | undefined) {}

  private fail(): never {
    // v2: open a pooled client from this.connectionString here and run the
    // SQL in db/schema.sql (users, projects, entities, relationships, …).
    throw new Error(POSTGRES_NOT_CONFIGURED);
  }

  async getWorld(): Promise<World> {
    return this.fail();
  }

  async getSnapshot(year: string): Promise<World> {
    void year;
    return this.fail();
  }

  async getNode(id: string): Promise<GNode | null> {
    void id;
    return this.fail();
  }

  async getCachedExpansion(queryHash: string): Promise<CachedExpansion | null> {
    void queryHash;
    return this.fail();
  }

  async saveExpansion(queryHash: string, data: CachedExpansion): Promise<void> {
    void queryHash;
    void data;
    return this.fail();
  }

  async logSimulation(entry: SimulationLog): Promise<void> {
    void entry;
    return this.fail();
  }

  async getCreditLedger(): Promise<CreditLedger> {
    return this.fail();
  }

  async recordCreditUse(entry: CreditLogEntry): Promise<void> {
    void entry;
    return this.fail();
  }

  async getSessionBudget(token: string): Promise<number> {
    void token;
    // v2 SQL: SELECT expansions FROM sessions WHERE token = $1
    return this.fail();
  }

  async recordSessionBudget(token: string, n: number): Promise<void> {
    void token;
    void n;
    // v2 SQL: INSERT INTO sessions (token, expansions, expires_at)
    //   VALUES ($1, $2, now() + interval '24 hours')
    //   ON CONFLICT (token) DO UPDATE SET expansions = sessions.expansions + $2,
    //   last_seen_at = now()
    return this.fail();
  }
}
