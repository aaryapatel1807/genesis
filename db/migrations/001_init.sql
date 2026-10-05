-- ============================================================================
-- Genesis — Postgres schema
-- Version: v1 (baseline)
-- Date:    2026-10-05
-- ============================================================================
-- v1 runtime storage is JSON files in data/ (JsonAdapter). This schema is the
-- v2 target for multi-user deployments with concurrent writes. It is versioned;
-- new changes ship as db/migrations/002_*.sql and friends.
--
-- Apply once:
--   psql $DATABASE_URL -f db/migrations/001_init.sql
--
-- Activate at runtime:
--   DB_ADAPTER=postgres DATABASE_URL=postgres://user:pass@host:5432/genesis …
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- users: every account that can own projects.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'Accounts that own Genesis projects.';

-- ----------------------------------------------------------------------------
-- projects: one investigation workspace (one "world" topic) per row.
-- ----------------------------------------------------------------------------
CREATE TABLE projects (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  topic      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE projects IS 'One investigation workspace per topic (e.g. "AI ecosystem").';
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- ----------------------------------------------------------------------------
-- entities: knowledge-graph nodes (companies, researchers, papers, …).
-- node_id is the stable n_<slug> key so snapshots can morph over time.
-- ----------------------------------------------------------------------------
CREATE TABLE entities (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id     TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN (
                'company','researcher','university','product','startup','funder',
                'patent','event','technology','paper','job','country','government','law')),
  description TEXT        NOT NULL DEFAULT '',
  influence   INTEGER     NOT NULL DEFAULT 0 CHECK (influence BETWEEN 0 AND 100),
  confidence  INTEGER     NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  freshness   TEXT        NOT NULL DEFAULT '',
  sources     INTEGER     NOT NULL DEFAULT 0,
  first_seen  TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, node_id)
);
COMMENT ON TABLE entities IS 'Knowledge-graph nodes. (project_id, node_id) is the dedupe key.';
CREATE INDEX idx_entities_project_id ON entities(project_id);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_project_type ON entities(project_id, type);

-- ----------------------------------------------------------------------------
-- relationships: typed, evidence-backed edges between entities.
-- ----------------------------------------------------------------------------
CREATE TABLE relationships (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id   UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id   UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  edge_id     TEXT        NOT NULL,
  relation    TEXT        NOT NULL CHECK (relation IN (
                'investment','partnership','supplies','employs',
                'researches','acquired','competes','powers')),
  strength    TEXT        NOT NULL DEFAULT 'medium' CHECK (strength IN ('strong','medium','weak')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_id <> target_id),
  UNIQUE (project_id, edge_id)
);
COMMENT ON TABLE relationships IS 'Knowledge-graph edges. Every edge must carry >=1 evidence row.';
CREATE INDEX idx_relationships_project_id ON relationships(project_id);
CREATE INDEX idx_relationships_source_target ON relationships(source_id, target_id);
CREATE INDEX idx_relationships_source_id ON relationships(source_id);
CREATE INDEX idx_relationships_target_id ON relationships(target_id);

-- ----------------------------------------------------------------------------
-- timeline: named time axis (e.g. the 2020–2026 time machine) per project.
-- ----------------------------------------------------------------------------
CREATE TABLE timeline (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL,
  year       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE timeline IS 'Named snapshot years a project can morph between (the time machine).';
CREATE INDEX idx_timeline_project_id ON timeline(project_id);

-- ----------------------------------------------------------------------------
-- events: dated occurrences on a project's timeline.
-- ----------------------------------------------------------------------------
CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timeline_id UUID        REFERENCES timeline(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  happened_at DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE events IS 'Dated occurrences attached to a project timeline.';
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_timeline_id ON events(timeline_id);

-- ----------------------------------------------------------------------------
-- sources: raw search results that back claims in the graph.
-- ----------------------------------------------------------------------------
CREATE TABLE sources (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engine     TEXT        NOT NULL DEFAULT '',
  url        TEXT        NOT NULL,
  title      TEXT        NOT NULL DEFAULT '',
  snippet    TEXT        NOT NULL DEFAULT '',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE sources IS 'Raw search results backing evidence rows.';
CREATE INDEX idx_sources_project_id ON sources(project_id);
CREATE INDEX idx_sources_url ON sources(url);

-- ----------------------------------------------------------------------------
-- evidence: "why connected" citations, one per edge per source.
-- ----------------------------------------------------------------------------
CREATE TABLE evidence (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  relationship_id UUID        NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  source_id       UUID        REFERENCES sources(id) ON DELETE SET NULL,
  snippet         TEXT        NOT NULL,
  url             TEXT        NOT NULL DEFAULT '',
  engine          TEXT        NOT NULL DEFAULT '',
  date            TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE evidence IS 'Edge citations. Every edge must have at least one evidence row.';
CREATE INDEX idx_evidence_relationship_id ON evidence(relationship_id);
CREATE INDEX idx_evidence_project_id ON evidence(project_id);
CREATE INDEX idx_evidence_source_id ON evidence(source_id);

-- ----------------------------------------------------------------------------
-- graphs: materialized world snapshots (the precomputed universes).
-- ----------------------------------------------------------------------------
CREATE TABLE graphs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_year TEXT,
  world_json    JSONB       NOT NULL,
  node_count    INTEGER     NOT NULL DEFAULT 0,
  edge_count    INTEGER     NOT NULL DEFAULT 0,
  source_count  INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, snapshot_year)
);
COMMENT ON TABLE graphs IS 'Materialized world JSON per snapshot year (current + 2020/2022/2024/2026).';
CREATE INDEX idx_graphs_project_id ON graphs(project_id);

-- ----------------------------------------------------------------------------
-- simulations: recorded future-scenario runs (auditable, replayable).
-- ----------------------------------------------------------------------------
CREATE TABLE simulations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  scenario   TEXT        NOT NULL,
  affected   TEXT[]      NOT NULL DEFAULT '{}',
  cascades   JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE simulations IS 'Recorded simulator runs. Results are labeled fiction, never factual.';
CREATE INDEX idx_simulations_project_id ON simulations(project_id);
CREATE INDEX idx_simulations_user_id ON simulations(user_id);

-- ----------------------------------------------------------------------------
-- cache: sha256-keyed blobs (SerpApi raw results, expansions) with TTL.
-- ----------------------------------------------------------------------------
CREATE TABLE cache (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash   TEXT        NOT NULL UNIQUE,
  payload    JSONB       NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE cache IS 'sha256-keyed TTL cache (SerpApi results, expansions). Swept by expiry.';
CREATE INDEX idx_cache_expires_at ON cache(expires_at);

-- ----------------------------------------------------------------------------
-- sessions: opaque session tokens tying expansion budgets to a caller.
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE,
  expansions   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);
COMMENT ON TABLE sessions IS 'Session tokens; expansion budget (10 fresh searches) tracked here.';
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
