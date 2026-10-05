# Genesis — Database

## v1: JSON files (the default)

The app ships and demos on **JSON files in `data/`** — zero ops, no database
server, no env vars. `data/world.json` and `data/snapshots/*.json` are
**committed** so Vercel deploys render the universe out of the box. Runtime
state (`data/cache/`, `data/credit-ledger.json`) stays gitignored.

All data access goes through the `DbAdapter` contract (`lib/db/adapter.ts`);
the default implementation is `JsonAdapter` (`lib/db/jsonAdapter.ts`). The
expansion cache reuses `lib/cache.ts` (same sha256 keys, same 7-day TTL) —
there is intentionally no second cache system.

## v2: Postgres (when and why to switch)

Switch to Postgres when you need any of:

- multiple users / workspaces with real ownership (`users`, `projects`),
- concurrent writes (expansion grafts, simulations, ledger) without file races,
- durable sessions, audit trails, and SQL querying over entities/evidence.

The v2 schema is `db/schema.sql` (12 tables): users, projects, entities,
relationships, timeline, events, sources, evidence, graphs, simulations,
cache, sessions. `lib/db/postgresAdapter.ts` is a typed skeleton — it throws
a clear `Postgres adapter not configured…` error until the SQL implementation
lands, so the build can never break on an unused adapter.

### Running migrations

Apply the v1 baseline once against your database:

```sh
psql $DATABASE_URL -f db/migrations/001_init.sql
```

Later changes ship as `db/migrations/002_*.sql`, `003_*.sql`, … in order.

### Switching the runtime to Postgres

```sh
DB_ADAPTER=postgres DATABASE_URL=postgres://user:pass@host:5432/genesis npm start
```

`getDb()` (`lib/db/index.ts`) returns the `PostgresAdapter` only when both
variables are set; anything else keeps the demo-safe `JsonAdapter`.
