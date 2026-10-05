'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, X, Zap } from 'lucide-react';
import { GEN_PHASE_META } from '@/lib/generation';
import { useWorldStore } from '@/stores/useWorldStore';
import { GenerationSequence } from '@/components/GenerationSequence';
import { Sheet } from '@/components/ui/sheet';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { StatPanel } from '@/components/dash/StatPanel';
import { AgentPanel } from '@/components/dash/AgentPanel';
import type {
  UniverseGraphHandle,
  UniverseGraphProps,
} from '@/components/UniverseGraph';
import type {
  CreditState,
  ExpandResponse,
  GEdge,
  GNode,
  NodeType,
  SimCascadeItem,
  SimulateResponse,
  World,
} from '@/lib/types';
import { EdgePanel } from '@/components/EdgePanel';
import { SimulatorPanel } from '@/components/SimulatorPanel';
import { SerendipityButton } from '@/components/SerendipityButton';
import { CreditPill } from '@/components/CreditPill';
import { Toast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';

const UniverseGraph = dynamic(
  () => import('@/components/UniverseGraph').then((m) => m.UniverseGraph),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center">
        <p className="text-sm text-muted">Preparing universe…</p>
      </div>
    ),
  },
) as unknown as React.ForwardRefExoticComponent<
  UniverseGraphProps & React.RefAttributes<UniverseGraphHandle>
>;

const YEARS = [2020, 2022, 2024, 2026];
const LATEST_YEAR = 2026;
/** Per-session expansion budget (mirrors lib/agents/memory.ts EXPANSION_BUDGET). */
const EXPANSION_BUDGET = 10;
const SESSION_KEY = 'genesis-session-id';

/** Full class literals so Tailwind's scanner picks up every type color. */
const TYPE_DOT: Record<NodeType, string> = {
  company: 'bg-n-company',
  researcher: 'bg-n-researcher',
  university: 'bg-n-university',
  product: 'bg-n-product',
  startup: 'bg-n-startup',
  funder: 'bg-n-funder',
  patent: 'bg-n-patent',
  event: 'bg-n-event',
  technology: 'bg-n-technology',
  paper: 'bg-n-paper',
  job: 'bg-n-job',
  country: 'bg-n-country',
  government: 'bg-n-government',
  law: 'bg-n-law',
};

const TYPE_LABEL: Record<NodeType, string> = {
  company: 'Company',
  researcher: 'Researcher',
  university: 'University',
  product: 'Product',
  startup: 'Startup',
  funder: 'Funder',
  patent: 'Patent',
  event: 'Event',
  technology: 'Technology',
  paper: 'Paper',
  job: 'Job',
  country: 'Country',
  government: 'Government',
  law: 'Law',
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed with status ${res.status}`);
  }
  const data: unknown = await res.json();
  return data as T;
}

function severityToImpact(severity: string): SimCascadeItem['impact'] {
  if (severity === 'critical' || severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

function pctDelta(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined;
  const d = ((current - previous) / previous) * 100;
  return `${d >= 0 ? '+' : ''}${Math.round(d)}%`;
}

function WorldView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const graphHandleRef = useRef<UniverseGraphHandle | null>(null);
  const reqRef = useRef(0);
  const { container, enterUp } = useMotionVariants();

  const [world, setWorld] = useState<World | null>(null);
  const [credits, setCredits] = useState<CreditState>({ used: 0, total: EXPANSION_BUDGET });
  const [sessionId, setSessionId] = useState<string>(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // Reconcile the session id with sessionStorage after mount (SSR-safe).
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        setSessionId(stored);
      } else {
        sessionStorage.setItem(SESSION_KEY, sessionId);
      }
    } catch {
      // sessionStorage unavailable — keep the in-memory id
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSessionId = useCallback((id: string) => {
    setSessionId(id);
    try {
      sessionStorage.setItem(SESSION_KEY, id);
    } catch {
      // ignore — in-memory id still works for this visit
    }
  }, []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(LATEST_YEAR);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [cascadeItems, setCascadeItems] = useState<SimCascadeItem[]>([]);
  const [affected, setAffected] = useState<string[]>([]);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [expandEmptyIds, setExpandEmptyIds] = useState<Set<string>>(new Set());
  /** Entity filter — decorative-but-functional search under the canvas. */
  const [filter, setFilter] = useState('');
  /** 2024 snapshot, used to compute "vs 2024" stat deltas. */
  const [baseline, setBaseline] = useState<World | null>(null);
  /** True once the first-load generation sequence has completed. */
  const [introDone, setIntroDone] = useState(false);
  const worldReadyRef = useRef(false);

  // Global UI state (zustand): generation phase, toast, announcements.
  const phase = useWorldStore((s) => s.phase);
  const setPhase = useWorldStore((s) => s.setPhase);
  const resetSequence = useWorldStore((s) => s.resetSequence);
  const showToast = useWorldStore((s) => s.showToast);
  const announcement = useWorldStore((s) => s.announcement);
  const announce = useWorldStore((s) => s.announce);

  const loadYear = useCallback(
    async (y: number, reqId: number): Promise<void> => {
      setLoading(true);
      setLoadError(null);
      try {
        const url = y === LATEST_YEAR ? '/api/world' : `/api/world/snapshot/${y}`;
        // Routes serve the World JSON directly (meta/nodes/edges).
        const data = await fetchJson<World>(url);
        if (reqId !== reqRef.current) return;
        setWorld(data);
        worldReadyRef.current = true;
        announce(
          `World loaded: ${data.meta.node_count} entities, ${data.meta.edge_count} connections.`,
        );
      } catch {
        if (reqId !== reqRef.current) return;
        setLoadError(
          'The universe could not be loaded. Check your connection and retry.',
        );
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    },
    [announce],
  );

  // Initial load: honors ?snapshot= and ?node= deep links, then runs the
  // staged generation sequence. The data fetch and the staged beats run in
  // parallel; the canvas handover (bloom → edges → camera → interaction)
  // waits for both. Reduced motion compresses every beat to a crossfade.
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = reduced ? 0.08 : 1;
    const sleep = (ms: number): Promise<void> =>
      new Promise((r) => setTimeout(r, ms * scale));
    let cancelled = false;

    const snap = Number.parseInt(searchParams.get('snapshot') ?? '', 10);
    const y = YEARS.includes(snap) ? snap : LATEST_YEAR;
    setYear(y);
    reqRef.current += 1;
    const reqId = reqRef.current;
    resetSequence();

    const load = loadYear(y, reqId).then(() => {
      if (cancelled || reqId !== reqRef.current) return;
      const nodeId = searchParams.get('node');
      if (nodeId) graphHandleRef.current?.flyTo(nodeId);
    });

    void (async () => {
      await sleep(GEN_PHASE_META.searching.durationMs);
      if (cancelled) return;
      setPhase('discovering');
      await sleep(GEN_PHASE_META.discovering.durationMs);
      if (cancelled) return;
      setPhase('relationships');
      await sleep(GEN_PHASE_META.relationships.durationMs);
      if (cancelled) return;
      setPhase('generating');
      await load; // the universe must exist before it can bloom
      await sleep(GEN_PHASE_META.generating.durationMs);
      if (cancelled || reqId !== reqRef.current) return;
      if (!worldReadyRef.current) {
        // Load failed — the error overlay takes over from here.
        setPhase('ready');
        setIntroDone(true);
        return;
      }
      setPhase('blooming');
      announce('World generated — rendering the universe.');
      graphHandleRef.current?.introZoom();
      await sleep(GEN_PHASE_META.blooming.durationMs);
      if (cancelled) return;
      setPhase('ready');
      announce('Universe ready. Interaction enabled.');
      setIntroDone(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Baseline snapshot for "vs 2024" deltas — best-effort, never blocks.
  useEffect(() => {
    let cancelled = false;
    void fetchJson<World>('/api/world/snapshot/2024')
      .then((data) => {
        if (!cancelled) setBaseline(data);
      })
      .catch(() => {
        // Deltas simply stay hidden when the snapshot can't load.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nodesById = useMemo(
    () => new Map<string, GNode>(world?.nodes.map((n) => [n.id, n]) ?? []),
    [world],
  );
  const edgeIds = useMemo(
    () => new Set<string>(world?.edges.map((e) => e.id) ?? []),
    [world],
  );
  const selectedEdge = selectedEdgeId
    ? (world?.edges.find((e) => e.id === selectedEdgeId) ?? null)
    : null;

  // Entity filter: matches node name or type, edges survive only when both
  // endpoints survive (decorative-but-functional).
  const filtered = useMemo(() => {
    if (!world) return { nodes: [] as GNode[], edges: [] as GEdge[] };
    const q = filter.trim().toLowerCase();
    if (!q) return { nodes: world.nodes, edges: world.edges };
    const nodes = world.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (TYPE_LABEL[n.type] ?? n.type).toLowerCase().includes(q),
    );
    const keep = new Set(nodes.map((n) => n.id));
    const edges = world.edges.filter((e) => keep.has(e.source) && keep.has(e.target));
    return { nodes, edges };
  }, [world, filter]);

  const pulsing = useMemo(() => new Set(affected), [affected]);
  const simActive = cascadeItems.length > 0;

  const dimmed = useMemo(() => {
    const d = new Set<string>();
    if (!world) return d;
    if (simActive) {
      // Simulation: everything not in the cascade dims.
      for (const n of world.nodes) {
        if (!pulsing.has(n.id)) d.add(n.id);
      }
    }
    return d;
  }, [world, simActive, pulsing]);

  const communities = useMemo(
    () => new Set(world?.nodes.map((n) => n.type) ?? []).size,
    [world],
  );
  const baselineCommunities = useMemo(
    () => new Set(baseline?.nodes.map((n) => n.type) ?? []).size,
    [baseline],
  );

  const stats = useMemo(() => {
    if (!world) return [];
    return [
      {
        label: 'Nodes',
        value: String(world.meta.node_count),
        delta: baseline ? pctDelta(world.meta.node_count, baseline.meta.node_count) : undefined,
      },
      {
        label: 'Edges',
        value: String(world.meta.edge_count),
        delta: baseline ? pctDelta(world.meta.edge_count, baseline.meta.edge_count) : undefined,
      },
      {
        label: 'Communities',
        value: String(communities),
        delta: baseline ? pctDelta(communities, baselineCommunities) : undefined,
      },
    ];
  }, [world, baseline, communities, baselineCommunities]);

  const topEntities = useMemo(() => {
    if (!world) return [];
    return [...world.nodes].sort((a, b) => b.influence - a.influence).slice(0, 6);
  }, [world]);

  const agentGroups = useMemo(
    () => [
      [
        { name: 'Analyst', detail: 'planner · drafting investigation plans', pct: 78 },
        { name: 'Explorer', detail: 'explorer · crawling entity candidates', pct: 64 },
        { name: 'Mapper', detail: 'relationship · wiring the relationship mesh', pct: 71 },
        {
          name: 'Validator',
          detail: `evidence · ${world?.meta.source_count ?? 0} sources cross-checked`,
          pct: 92,
        },
      ],
      [
        { name: 'Ranker', detail: 'ranking · scoring entity influence', pct: 88 },
        { name: 'Simulator', detail: 'simulation · running what-if scenarios', pct: 57 },
        { name: 'Narrator', detail: 'narrator · composing world storylines', pct: 66 },
        { name: 'Curator', detail: 'search · live search via SerpApi', pct: 45 },
      ],
    ],
    [world],
  );

  // Esc: close panels first, then reset the simulation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (selectedEdgeId !== null || simOpen) {
        setSelectedEdgeId(null);
        setSimOpen(false);
      } else if (cascadeItems.length > 0 || simulating) {
        setCascadeItems([]);
        setAffected([]);
        setSimulating(false);
        announce('Simulation cleared.');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEdgeId, simOpen, cascadeItems.length, simulating, announce]);

  const closePanels = useCallback(() => {
    setSelectedEdgeId(null);
    setSimOpen(false);
  }, []);

  const handleNodeClick = useCallback(
    (node: GNode) => {
      router.push(`/entity/${node.id}`);
    },
    [router],
  );

  const handleEdgeClick = useCallback((edge: GEdge) => {
    setSimOpen(false);
    setSelectedEdgeId(edge.id);
  }, []);

  const handleExpand = useCallback(
    async (nodeId: string) => {
      if (expandingId !== null) return;
      setExpandingId(nodeId);
      try {
        const data = await fetchJson<ExpandResponse>('/api/world/expand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
          },
          body: JSON.stringify({ nodeId }),
        });
        if (data.sessionId && data.sessionId !== sessionId) {
          persistSessionId(data.sessionId);
        }
        setCredits((c) => ({
          used: c.used + (typeof data.searchesUsed === 'number' ? data.searchesUsed : 0),
          total: c.total,
        }));
        const freshNodes = data.addedNodes.filter((n) => !nodesById.has(n.id));
        const freshEdges = data.addedEdges.filter((e) => !edgeIds.has(e.id));
        if (data.note) {
          showToast(data.note, 'info');
        }
        if (freshNodes.length === 0 && freshEdges.length === 0) {
          setExpandEmptyIds((s) => new Set(s).add(nodeId));
          announce('No further entities found in live search.');
          return;
        }
        setExpandEmptyIds((s) => {
          const next = new Set(s);
          next.delete(nodeId);
          return next;
        });
        setWorld((prev) =>
          prev
            ? {
                ...prev,
                meta: {
                  ...prev.meta,
                  node_count: prev.meta.node_count + freshNodes.length,
                  edge_count: prev.meta.edge_count + freshEdges.length,
                },
                nodes: [...prev.nodes, ...freshNodes],
                edges: [...prev.edges, ...freshEdges],
              }
            : prev,
        );
        announce(
          `Expansion complete: ${freshNodes.length} new entities grafted.`,
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          // Session expansion budget exhausted — graph keeps working.
          setCredits((c) => ({ used: c.total, total: c.total }));
          showToast(
            'Live expansion paused — showing cached universe.',
            'warn',
          );
          announce('Live expansion paused — search budget exhausted.');
        } else {
          showToast(
            'Expansion failed — the cached universe is unchanged.',
            'error',
          );
        }
      } finally {
        setExpandingId(null);
      }
    },
    [expandingId, sessionId, persistSessionId, nodesById, edgeIds, showToast, announce],
  );

  const handleSimulate = useCallback(
    async (scenario: string) => {
      setSimulating(true);
      try {
        const data = await fetchJson<SimulateResponse>('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario }),
        });
        const items: SimCascadeItem[] = data.cascades.map((c) => ({
          nodeId: c.nodeId,
          nodeName: nodesById.get(c.nodeId)?.name ?? c.nodeId,
          effect: c.effect,
          impact: severityToImpact(c.severity),
        }));
        setCascadeItems(items);
        setAffected(data.affected);
        if (data.note) {
          showToast(data.note, 'info');
        }
        announce(`Simulation complete: ${items.length} cascade effects.`);
      } catch {
        showToast('Simulation failed — please try again.', 'error');
      } finally {
        setSimulating(false);
      }
    },
    [nodesById, showToast, announce],
  );

  const handleResetSim = useCallback(() => {
    setCascadeItems([]);
    setAffected([]);
    setSimulating(false);
    announce('Simulation cleared.');
  }, [announce]);

  const handleSurprise = useCallback(() => {
    if (!world || world.nodes.length === 0) return;
    const recent = world.nodes.filter((n) => n.first_seen >= '2022');
    const pool = recent.length > 0 ? recent : world.nodes;
    const sorted = [...pool].sort((a, b) => b.influence - a.influence);
    const top = sorted.slice(0, Math.max(5, Math.ceil(sorted.length * 0.25)));
    const pick = top[Math.floor(Math.random() * top.length)] ?? sorted[0];
    if (!pick) return;
    setSelectedEdgeId(null);
    setSimOpen(false);
    graphHandleRef.current?.flyTo(pick.id);
    announce(`Serendipity: flying to ${pick.name}.`);
  }, [world, announce]);

  return (
    <AppShell chrome="app" title="Knowledge Graph">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid flex-1 grid-cols-1 gap-3 p-3 sm:p-4 xl:grid-cols-[264px_minmax(0,1fr)_264px]"
        >
          {/* Left column — statistics + active entities */}
          <motion.aside
            variants={enterUp}
            aria-label="Knowledge statistics"
            className="flex min-h-0 flex-col gap-3"
          >
            <StatPanel title="Knowledge Statistics" stats={stats} footer="vs 2024 snapshot" />
            <GlassPanel title="Active Entities" className="min-h-0 flex-1">
              <ul className="flex flex-col gap-1">
                {topEntities.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/entity/${node.id}`)}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                    >
                      <span
                        aria-hidden="true"
                        className={cn('h-2 w-2 shrink-0 rounded-full', TYPE_DOT[node.type])}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink group-hover:text-gold">
                          {node.name}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {TYPE_LABEL[node.type]} · influence {node.influence}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </motion.aside>

          {/* Center — universe canvas + toolbar + filter */}
          <motion.section
            variants={enterUp}
            aria-label="Universe graph"
            className="flex min-h-0 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <CreditPill used={credits.used} total={credits.total} />
              <SerendipityButton onSurprise={handleSurprise} disabled={!world} />
              <button
                type="button"
                aria-expanded={simOpen}
                onClick={() => {
                  setSimOpen((open) => {
                    if (!open) setSelectedEdgeId(null);
                    return !open;
                  });
                }}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium backdrop-blur-md transition-all hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70',
                  simOpen
                    ? 'border-gold/60 bg-gold/15 text-gold'
                    : 'border-line bg-surface/80 text-ink hover:border-gold/60 hover:text-gold',
                )}
              >
                <Zap size={16} aria-hidden="true" />
                Simulate
              </button>
            </div>

            <div className="relative h-[62vh] min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-line bg-void/60 shadow-[0_0_80px_rgba(45,212,191,0.06)]">
              {world && (
                <UniverseGraph
                  ref={graphHandleRef}
                  nodes={filtered.nodes}
                  edges={filtered.edges}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  dimmed={dimmed}
                  pulsing={pulsing}
                  introReveal={phase === 'blooming' || phase === 'ready'}
                  interactive={phase === 'ready'}
                  onNodeExpand={(node) => {
                    void handleExpand(node.id);
                  }}
                  onBackgroundClick={closePanels}
                />
              )}
              {filter.trim() !== '' && world && (
                <p
                  aria-live="polite"
                  className="absolute left-3 top-3 rounded-full border border-line bg-void/80 px-3 py-1 font-mono text-[11px] text-muted backdrop-blur-md"
                >
                  {filtered.nodes.length} of {world.nodes.length} entities match
                </p>
              )}
            </div>

            {/* Filter search bar */}
            <div
              role="search"
              className="flex items-center gap-2 rounded-full border border-line bg-surface/80 py-2 pl-4 pr-2 backdrop-blur-md transition-colors focus-within:border-gold/60"
            >
              <Search size={15} aria-hidden="true" className="shrink-0 text-muted" />
              <label htmlFor="world-filter" className="sr-only">
                Filter entities by name or type
              </label>
              <input
                id="world-filter"
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter: sector=climate, year=2024…"
                className="w-full bg-transparent font-mono text-[12px] text-ink placeholder:text-muted/60 focus:outline-none"
              />
              {filter !== '' && (
                <button
                  type="button"
                  aria-label="Clear filter"
                  onClick={() => setFilter('')}
                  className="rounded-full p-1 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </motion.section>

          {/* Right column — pipeline agents */}
          <motion.aside
            variants={enterUp}
            aria-label="Active AI agents"
            className="flex min-h-0 flex-col gap-3"
          >
            {agentGroups.map((agents, i) => (
              <AgentPanel
                key={i}
                title="Active AI Agents"
                agents={agents}
                className="min-h-0 flex-1"
              />
            ))}
          </motion.aside>
        </motion.div>

        {/* Edge panel — bottom sheet */}
        <AnimatePresence>
          {selectedEdge && (
            <Sheet
              key={`edge-${selectedEdge.id}`}
              open
              onClose={() => setSelectedEdgeId(null)}
              label="Connection details"
              side="bottom"
              className="absolute inset-x-0 bottom-0 z-20 px-4"
            >
              <EdgePanel
                edge={selectedEdge}
                sourceName={nodesById.get(selectedEdge.source)?.name ?? selectedEdge.source}
                targetName={nodesById.get(selectedEdge.target)?.name ?? selectedEdge.target}
                onClose={() => setSelectedEdgeId(null)}
              />
            </Sheet>
          )}
        </AnimatePresence>

        {/* Simulator — left overlay */}
        <AnimatePresence>
          {simOpen && (
            <Sheet
              key="simulator"
              open
              onClose={() => setSimOpen(false)}
              label="Scenario simulator"
              side="right"
              className="absolute left-0 top-0 z-20 h-full"
            >
              <SimulatorPanel
                simulating={simulating}
                items={cascadeItems}
                onSimulate={handleSimulate}
                onReset={handleResetSim}
                onClose={() => setSimOpen(false)}
              />
            </Sheet>
          )}
        </AnimatePresence>

        {/* Toast */}
        <div className="absolute bottom-20 right-4 z-30">
          <Toast />
        </div>

        {/* Generation sequence — the staged world birth.
            Always mounted: its internal AnimatePresence plays the blur-fade
            exit when the phase reaches "ready". */}
        <GenerationSequence />

        {/* Snapshot loading — lightweight chip, the sequence already ran */}
        {introDone && loading && world && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-full border border-line bg-surface/90 px-4 py-2 font-mono text-[11px] text-muted backdrop-blur-md"
            >
              <Loader2 size={12} aria-hidden="true" className="animate-spin text-gold" />
              Loading {year}…
            </motion.div>
          </div>
        )}

        {/* Load error */}
        {loadError && !world && !loading && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-void/80">
            <div className="w-full max-w-sm rounded-[14px] border border-line bg-surface p-6 text-center">
              <p className="text-[15px] font-semibold">The universe is offline</p>
              <p className="mt-2 text-[13px] text-muted">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  reqRef.current += 1;
                  void loadYear(year, reqRef.current);
                }}
                className="mt-4 rounded-xl bg-gold px-6 py-2.5 text-[14px] font-semibold text-void transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Honest empty state */}
        {!loading && !loadError && world && world.nodes.length === 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <EmptyState
              message="The universe came back empty — no entities were found."
              hint="Try reloading, or check that the world build completed."
            />
          </div>
        )}

        {/* Screen-reader announcements */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>
    </AppShell>
  );
}

export default function WorldPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-full min-h-[60vh] place-items-center bg-void text-ink">
          <p className="text-sm text-muted">Preparing universe…</p>
        </div>
      }
    >
      <WorldView />
    </Suspense>
  );
}
