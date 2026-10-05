export type NodeType = 'company'|'researcher'|'university'|'product'|'startup'|'funder'|'patent'|'event'|'technology'|'paper'|'job'|'country'|'government'|'law';
export type Relation = 'investment'|'partnership'|'supplies'|'employs'|'researches'|'acquired'|'competes'|'powers';
export type Strength = 'strong'|'medium'|'weak';
export interface Reality { confidence: number; freshness: string; sources: number; }
export interface GNode { id: string; name: string; type: NodeType; description: string; influence: number; reality: Reality; first_seen: string; }
export interface Evidence { snippet: string; url: string; engine: string; date: string; }
export interface GEdge { id: string; source: string; target: string; relation: Relation; strength: Strength; evidence: Evidence[]; }
export interface WorldMeta { topic: string; built_at: string; node_count: number; edge_count: number; source_count: number; snapshot_year?: string; }
export interface World { meta: WorldMeta; nodes: GNode[]; edges: GEdge[]; }

// --- Derived mappings -------------------------------------------------------

export const NODE_COLORS: Record<NodeType, string> = {
  company: '#2dd4bf',
  researcher: '#a78bfa',
  university: '#5aa9ff',
  product: '#f5b942',
  startup: '#4ade80',
  funder: '#f472b6',
  patent: '#94a3b8',
  event: '#e8edf4',
  technology: '#22d3ee',
  paper: '#818cf8',
  job: '#fb923c',
  country: '#64748b',
  government: '#a8a29e',
  law: '#fb7185',
};

export type Layer = 'Companies' | 'Research' | 'News' | 'Jobs' | 'Funding' | 'Products';

export const LAYERS: Record<Layer, NodeType[]> = {
  Companies: ['company', 'startup', 'funder'],
  Research: ['researcher', 'university', 'paper', 'technology'],
  News: ['event'],
  Jobs: ['job'],
  Funding: ['funder', 'startup'],
  Products: ['product'],
};

export const LAYER_ORDER: Layer[] = [
  'Companies',
  'Research',
  'News',
  'Jobs',
  'Funding',
  'Products',
];

// --- API contracts (frontend <-> /api/* routes) -----------------------------
// These mirror the backend route response shapes in app/api/*.

export interface CreditState {
  used: number;
  total: number;
}

/** GET /api/world and GET /api/world/snapshot/[year] return the World directly. */
export type WorldApiResponse = World;

/** POST /api/world/expand — session-scoped budget (x-session-id header). */
export interface ExpandResponse {
  addedNodes: GNode[];
  addedEdges: GEdge[];
  searchesUsed: number;
  cached: boolean;
  sessionId: string;
  note?: string;
}

export type CascadeSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SimCascade {
  node: string;
  effect: string;
  severity: CascadeSeverity;
}

/** POST /api/simulate */
export interface SimulateResponse {
  scenario: string;
  label: string;
  affected: string[];
  cascades: SimCascade[];
  note?: string;
  isSimulation: true;
}

/** Cascade row resolved for display in SimulatorPanel. */
export interface SimCascadeItem {
  nodeId: string;
  nodeName: string;
  effect: string;
  impact: 'high' | 'medium' | 'low';
}

/** A node's connections, resolved by the world page for NodePanel. */
export interface Connection {
  edge: GEdge;
  other: GNode;
}

// --- Database layer types ---------------------------------------------------
// v1 is JSON files in data/ (lib/db/jsonAdapter.ts); v2 is Postgres
// (lib/db/postgresAdapter.ts, db/schema.sql). Both expose the same DbAdapter
// contract (lib/db/adapter.ts). These structural types are intentionally
// self-contained so they don't create import cycles with lib/agents/*.

/** Structurally compatible with Extraction from lib/agents/explorer. */
export interface CachedExpansionEntity {
  name: string;
  type: NodeType;
  description: string;
}

/** Structurally compatible with ExtractedRelation from lib/agents/explorer. */
export interface CachedExpansionRelation {
  source: string;
  target: string;
  relation: Relation;
  evidence_snippet: string;
}

/** One cached node-expansion result, stored under its query sha256. */
export interface CachedExpansion {
  entities: CachedExpansionEntity[];
  relations: CachedExpansionRelation[];
  cached_at?: string;
}

/** One entry appended to the SerpApi credit ledger. */
export interface CreditLogEntry {
  at: string;
  engine: string;
  query_hash: string;
  cached: boolean;
}

/** Aggregated credit state: plan limit, credits spent, full log. */
export interface CreditLedger {
  planLimit: number;
  used: number;
  log: CreditLogEntry[];
}

/** One simulation run recorded for audit/replay. */
export interface SimulationLog {
  at: string;
  scenario: string;
  affected: string[];
  cascades: SimCascade[];
  sessionId?: string;
}
