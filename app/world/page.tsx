'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, X, Zap } from 'lucide-react';
import { GEN_PHASE_META } from '@/lib/generation';
import { CATEGORIES, categoryOf } from '@/lib/category';
import { useWorldStore } from '@/stores/useWorldStore';
import { GenerationSequence } from '@/components/GenerationSequence';
import { FloatingAgents } from '@/components/FloatingAgents';
import { EntityInspector } from '@/components/EntityInspector';
import { BottomDock } from '@/components/BottomDock';
import { Sheet } from '@/components/ui/sheet';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import type {
  UniverseGraphHandle,
  UniverseGraphProps,
} from '@/components/UniverseGraph';
import type {
  CreditState,
  ExpandResponse,
  GEdge,
  GNode,
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
import { TimeSlider } from '@/components/TimeSlider';

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

/** Human relative time for the stat strip, e.g. "23h ago". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatItem({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function WorldView() {
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
  /** Inspector target — node click opens the slide-in inspector, graph stays. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [cascadeItems, setCascadeItems] = useState<SimCascadeItem[]>([]);
  const [affected, setAffected] = useState<string[]>([]);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  /** Entity filter — decorative-but-functional search under the canvas. */
  const [filter, setFilter] = useState('');
  /** Category filter — null = all categories, otherwise the active set. */
  const [activeCategories, setActiveCategories] = useState<string[] | null>(null);
  /** True once the first-load generation sequence has completed. */
  const [introDone, setIntroDone] = useState(false);
  /** World-search query in the load-failure empty state. */
  const [emptyQuery, setEmptyQuery] = useState('');
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

  /** Timeline scrubbing — loads a historical snapshot without re-running
      the generation sequence (new nodes bloom in on the existing canvas). */
  const handleYearChange = useCallback(
    (y: number) => {
      if (y === year || !YEARS.includes(y)) return;
      setYear(y);
      setSelectedId(null);
      setSelectedEdgeId(null);
      reqRef.current += 1;
      void loadYear(y, reqRef.current);
    },
    [year, loadYear],
  );

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
  // endpoints survive (decorative-but-functional). Category filtering is
  // visual (UniverseGraph dims non-matching nodes) and layers on top.
  const filtered = useMemo(() => {
    if (!world) return { nodes: [] as GNode[], edges: [] as GEdge[] };
    const q = filter.trim().toLowerCase();
    if (!q) return { nodes: world.nodes, edges: world.edges };
    const nodes = world.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q),
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

  /** Stat strip: topic, counts, average evidence confidence, build age.
      The "updated" age is the dataset build time, labelled honestly. */
  const avgConfidence = useMemo(() => {
    if (!world || world.nodes.length === 0) return null;
    const sum = world.nodes.reduce(
      (a, n) => a + (n.reality?.confidence ?? 0),
      0,
    );
    return Math.round(sum / world.nodes.length);
  }, [world]);

  const builtAt = world?.meta.built_at ?? null;
  const updatedAgo = useMemo(
    () => (builtAt ? relativeTime(builtAt) : null),
    [builtAt],
  );

  // Category chips — toggle buttons with aria-pressed. "All" resets.
  const toggleCategory = useCallback(
    (id: string) => {
      setActiveCategories((prev) => {
        const next =
          prev === null
            ? [id]
            : prev.includes(id)
              ? prev.filter((c) => c !== id)
              : [...prev, id];
        const result = next.length === 0 ? null : next;
        const names =
          result === null
            ? 'all categories'
            : result
                .map((c) => CATEGORIES.find((cat) => cat.id === c)?.label ?? c)
                .join(', ');
        announce(`Category filter: ${names}.`);
        return result;
      });
    },
    [announce],
  );

  // Esc: close panels first, then reset the simulation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (selectedId !== null || selectedEdgeId !== null || simOpen) {
        setSelectedId(null);
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
  }, [selectedId, selectedEdgeId, simOpen, cascadeItems.length, simulating, announce]);

  // Cross-component events from the dock/inspector (documented in BottomDock):
  //  - genesis:filter { detail: { categories: string[] } } — entries may be
  //    category ids ('companies') or raw entity types ('company'); normalize.
  //  - genesis:select-node { detail: { nodeId: string } } — open the inspector.
  useEffect(() => {
    const onFilter = (e: Event): void => {
      const detail = (e as CustomEvent).detail as
        | { categories?: string[] }
        | undefined;
      const raw = detail?.categories;
      if (!raw || raw.length === 0) {
        setActiveCategories(null);
        return;
      }
      const catIds = new Set(CATEGORIES.map((c) => c.id));
      const mapped = raw.map((v) =>
        catIds.has(v) ? v : categoryOf(v).id,
      );
      setActiveCategories(Array.from(new Set(mapped)));
      announce(`Graph filtered to ${mapped.length} categor${mapped.length === 1 ? 'y' : 'ies'}.`);
    };
    const onSelectNode = (e: Event): void => {
      const detail = (e as CustomEvent).detail as { nodeId?: string } | undefined;
      if (detail?.nodeId) setSelectedId(detail.nodeId);
    };
    window.addEventListener('genesis:filter', onFilter);
    window.addEventListener('genesis:select-node', onSelectNode);
    return () => {
      window.removeEventListener('genesis:filter', onFilter);
      window.removeEventListener('genesis:select-node', onSelectNode);
    };
  }, [announce]);

  const closePanels = useCallback(() => {
    setSelectedId(null);
    setSelectedEdgeId(null);
    setSimOpen(false);
  }, []);

  const handleNodeClick = useCallback((node: GNode) => {
    // Inspector is the new primary — the graph stays put.
    setSelectedEdgeId(null);
    setSelectedId(node.id);
  }, []);

  const handleEdgeClick = useCallback((edge: GEdge) => {
    setSelectedId(null);
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
          announce('No further entities found in live search.');
          return;
        }
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
    closePanels();
    graphHandleRef.current?.flyTo(pick.id);
    announce(`Serendipity: flying to ${pick.name}.`);
  }, [world, announce, closePanels]);

  /** Load-failure empty state: the search is honest — this build ships one
      pre-built world, so searching retries that load instead of faking a
      new universe. */
  const handleEmptySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      showToast(
        'This build ships one pre-built world — the AI ecosystem universe. Retrying that load.',
        'info',
      );
      announce('Retrying the world load.');
      reqRef.current += 1;
      void loadYear(year, reqRef.current);
    },
    [showToast, announce, loadYear, year],
  );

  const categoryPressed = (id: string): boolean =>
    activeCategories === null || activeCategories.includes(id);

  return (
    <AppShell chrome="app" title="Knowledge Graph">
      <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
          {/* Stat strip */}
          {world && (
            <motion.header
              variants={enterUp}
              aria-label="World overview"
              className="glass !p-4 sm:!p-5"
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                    World
                  </p>
                  <h1 className="truncate text-xl font-semibold text-ink sm:text-2xl">
                    {world.meta.topic}
                  </h1>
                </div>
                <StatItem label="Entities" value={String(world.meta.node_count)} />
                <StatItem label="Relationships" value={String(world.meta.edge_count)} />
                {avgConfidence !== null && (
                  <StatItem label="Avg confidence" value={`${avgConfidence}%`} />
                )}
                {updatedAgo !== null && (
                  <div className="sm:ml-auto" title={builtAt ?? undefined}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                      Updated
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink">{updatedAgo}</p>
                    <p className="text-[11px] text-muted">dataset build time</p>
                  </div>
                )}
              </div>
            </motion.header>
          )}

          {/* Category filter chips — replace the old LayerBar */}
          <motion.div
            variants={enterUp}
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={activeCategories === null}
              onClick={() => {
                setActiveCategories(null);
                announce('Category filter cleared — showing all categories.');
              }}
              className={cn('ghost', activeCategories === null && 'on')}
            >
              All
            </button>
            {CATEGORIES.map((c) => {
              const pressed = categoryPressed(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleCategory(c.id)}
                  className={cn('ghost flex items-center gap-2', pressed && 'on')}
                  style={
                    pressed
                      ? {
                          borderColor: `var(--cat-${c.id})`,
                          color: `var(--cat-${c.id})`,
                          background: 'rgba(255,255,255,0.04)',
                        }
                      : undefined
                  }
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: `var(--cat-${c.id})` }}
                  />
                  {c.label}
                </button>
              );
            })}
          </motion.div>

          {/* Toolbar + filter */}
          <motion.div variants={enterUp} className="flex flex-wrap items-center gap-2">
            <CreditPill used={credits.used} total={credits.total} />
            <SerendipityButton onSurprise={handleSurprise} disabled={!world} />
            <Button
              variant={simOpen ? 'primary' : 'secondary'}
              size="sm"
              icon={<Zap size={16} aria-hidden="true" />}
              aria-expanded={simOpen}
              onClick={() => {
                setSimOpen((open) => {
                  if (!open) setSelectedEdgeId(null);
                  return !open;
                });
              }}
            >
              Simulate
            </Button>
          </motion.div>

          <motion.div variants={enterUp} role="search" className="search">
            <Search size={15} aria-hidden="true" className="shrink-0" />
            <label htmlFor="world-filter" className="sr-only">
              Filter entities by name or type
            </label>
            <input
              id="world-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter: researcher, startup, paper…"
            />
            {filter !== '' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear filter"
                onClick={() => setFilter('')}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            )}
          </motion.div>

          {/* Universe canvas */}
          <motion.section
            variants={enterUp}
            aria-label="Universe graph"
            className="relative"
          >
            <div className="glass relative h-[62vh] min-h-[420px] overflow-hidden !p-0">
              {world && (
                <UniverseGraph
                  ref={graphHandleRef}
                  nodes={filtered.nodes}
                  edges={filtered.edges}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  dimmed={dimmed}
                  pulsing={pulsing}
                  activeCategories={activeCategories}
                  onCategoryToggle={toggleCategory}
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
                  className="absolute right-3 top-3 rounded-full border border-line bg-void/80 px-3 py-1 font-mono text-[11px] text-muted backdrop-blur-md"
                >
                  {filtered.nodes.length} of {world.nodes.length} entities match
                </p>
              )}
              {/* Timeline scrubbing */}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
                <div className="pointer-events-auto">
                  <TimeSlider year={year} onChange={handleYearChange} />
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>

        {/* Floating agents — coordinator-owned overlay */}
        <FloatingAgents phase={phase} />

        {/* Entity inspector — slides in on node click, graph stays */}
        <EntityInspector nodeId={selectedId} onClose={() => setSelectedId(null)} />

        {/* Bottom dock — coordinator-owned */}
        {world && <BottomDock world={world} />}

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

        {/* Simulator — right overlay */}
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

        {/* Generation sequence — the staged world birth, now the single
            loading narrative. The agent checklist lives inside the overlay
            (see GenerationSequence); no second checklist is rendered here. */}
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

        {/* Load failure — honest empty state, no fake data */}
        {loadError && !world && !loading && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-void/80 p-6">
            <div className="glass w-full max-w-md text-center">
              <h2 className="text-xl font-semibold text-ink">
                What world would you like to explore?
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Genesis builds a living knowledge universe from live search —
                companies, researchers, papers, funding and the relationships
                between them, all evidence-backed. This build ships one
                pre-built world: the AI ecosystem.
              </p>
              <form onSubmit={handleEmptySubmit} className="mt-5">
                <div className="search searchbig mx-auto">
                  <Search size={16} aria-hidden="true" className="shrink-0" />
                  <label htmlFor="world-search" className="sr-only">
                    Search for a world to explore
                  </label>
                  <input
                    id="world-search"
                    type="search"
                    value={emptyQuery}
                    onChange={(e) => setEmptyQuery(e.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button variant="primary" size="md" type="submit">
                    Explore the AI world
                  </Button>
                </div>
              </form>
              <p className="mt-3 text-[12px] text-muted">
                {loadError} Custom world search is not available in this build —
                no placeholder data will be generated.
              </p>
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
