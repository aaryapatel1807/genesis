/**
 * lib/db/index.ts — adapter factory. Call getDb() from API routes.
 *
 * Default: JsonAdapter (data/*.json — zero ops, demo-safe).
 * Opt-in:  PostgresAdapter when DB_ADAPTER=postgres AND DATABASE_URL is set.
 */
import type { DbAdapter } from './adapter';
import { JsonAdapter } from './jsonAdapter';
import { PostgresAdapter } from './postgresAdapter';

let instance: DbAdapter | null = null;

export function getDb(): DbAdapter {
  if (!instance) {
    if (process.env.DB_ADAPTER === 'postgres' && process.env.DATABASE_URL) {
      instance = new PostgresAdapter(process.env.DATABASE_URL);
    } else {
      instance = new JsonAdapter();
    }
  }
  return instance;
}

/** Test-only hook: reset the singleton so env changes take effect. */
export function resetDb(): void {
  instance = null;
}

export type { DbAdapter } from './adapter';
export { JsonAdapter } from './jsonAdapter';
export { PostgresAdapter, POSTGRES_NOT_CONFIGURED } from './postgresAdapter';
