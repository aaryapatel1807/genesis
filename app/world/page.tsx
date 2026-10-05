'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  LAYERS,
  LAYER_ORDER,
  type Connection,
  type CreditState,
  type ExpandResponse,
  type GEdge,
  type GNode,
  type Layer,
  type NodeType,
  type SimCascadeItem,
  type SimulateResponse,
  type World,
} from '@/lib/types';
import type {
  UniverseGraphHandle,
  UniverseGraphProps,
} from '@/components/UniverseGraph';
import { LayerBar } from '@/components/LayerBar';
import { TimeSlider } from '@/components/TimeSlider';
import { NodePanel } from '@/components/NodePanel';
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

function WorldView() {
  const searchParams = useSearchParams();
  const graphHandleRef = useRef<UniverseGraphHandle | null>(null);
  const reqRef = useRef(0);

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
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(
    () => new Set(LAYER_ORDER),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [cascadeItems, setCascadeItems] = useState<SimCascadeItem[]>([]);
  const [affected, setAffected] = useState<string[]>([]);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [expandEmptyIds, setExpandEmptyIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    kind: 'info' | 'warn' | 'error';
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const showToast = useCallback(
    (message: string, kind: 'info' | 'warn' | 'error' = 'info') => {
      setToast({ message, kind });
    },
    [],
  );
  const dismissToast = useCallback(() => setToast(null), []);
  const announce = useCallback((text: string) => setAnnouncement(text), []);

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

  // Initial load: honors ?snapshot= and ?node= deep links.
  useEffect(() => {
    const snap = Number.parseInt(searchParams.get('snapshot') ?? '', 10);
    const y = YEARS.includes(snap) ? snap : LATEST_YEAR;
    setYear(y);
    reqRef.current += 1;
    const reqId = reqRef.current;
    void loadYear(y, reqId).then(() => {
      if (reqId !== reqRef.current) return;
      const nodeId = searchParams.get('node');
      if (nodeId) setSelectedNodeId(nodeId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodesById = useMemo(
    () => new Map<string, GNode>(world?.nodes.map((n) => [n.id, n]) ?? []),
    [world],
  );
  const edgeIds = useMemo(
    () => new Set<string>(world?.edges.map((e) => e.id) ?? []),
    [world],
  );
  const selectedNode = selectedNodeId ? (nodesById.get(selectedNodeId) ?? null) : null;
  const selectedEdge = selectedEdgeId
    ? (world?.edges.find((e) => e.id === selectedEdgeId) ?? null)
    : null;

  const connections = useMemo<Connection[]>(() => {
    if (!world || !selectedNode) return [];
    const out: Connection[] = [];
    for (const edge of world.edges) {
      if (edge.source === selectedNode.id) {
        const other = nodesById.get(edge.target);
        if (other) out.push({ edge, other });
      } else if (edge.target === selectedNode.id) {
        const other = nodesById.get(edge.source);
        if (other) out.push({ edge, other });
      }
    }
    return out;
  }, [world, selectedNode, nodesById]);

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
      return d;
    }
    const visible = new Set<NodeType>();
    activeLayers.forEach((layer) => {
      for (const t of LAYERS[layer]) visible.add(t);
    });
    for (const n of world.nodes) {
      if (!visible.has(n.type)) d.add(n.id);
    }
    return d;
  }, [world, activeLayers, simActive, pulsing]);

  const budgetExhausted = credits.total > 0 && credits.used >= credits.total;

  // Esc: close panels first, then reset the simulation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (selectedNodeId !== null || selectedEdgeId !== null || simOpen) {
        setSelectedNodeId(null);
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
  }, [selectedNodeId, selectedEdgeId, simOpen, cascadeItems.length, simulating, announce]);

  const closePanels = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSimOpen(false);
  }, []);

  const handleNodeClick = useCallback((node: GNode) => {
    setSelectedEdgeId(null);
    setSimOpen(false);
    setSelectedNodeId(node.id);
  }, []);

  const handleEdgeClick = useCallback((edge: GEdge) => {
    setSelectedNodeId(null);
    setSimOpen(false);
    setSelectedEdgeId(edge.id);
  }, []);

  const handleJump = useCallback((nodeId: string) => {
    setSelectedEdgeId(null);
    setSimOpen(false);
    setSelectedNodeId(nodeId);
    graphHandleRef.current?.flyTo(nodeId);
  }, []);

  const handleToggleLayer = useCallback((layer: Layer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const handleYearChange = useCallback(
    (y: number) => {
      if (y === year) return;
      setYear(y);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSimOpen(false);
      setCascadeItems([]);
      setAffected([]);
      setSimulating(false);
      reqRef.current += 1;
      void loadYear(y, reqRef.current);
    },
    [year, loadYear],
  );

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
          used: c.used + data.searchesUsed,
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
          nodeId: c.node,
          nodeName: nodesById.get(c.node)?.name ?? c.node,
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
    setSelectedNodeId(pick.id);
    graphHandleRef.current?.flyTo(pick.id);
    announce(`Serendipity: flying to ${pick.name}.`);
  }, [world, announce]);

  return (
    <main className="vignette fixed inset-0 overflow-hidden bg-void text-ink">
      {/* Canvas */}
      <div className="absolute inset-0">
        {world && (
          <UniverseGraph
            ref={graphHandleRef}
            nodes={world.nodes}
            edges={world.edges}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            dimmed={dimmed}
            pulsing={pulsing}
            onNodeExpand={(node) => {
              void handleExpand(node.id);
            }}
            onBackgroundClick={closePanels}
          />
        )}
      </div>

      {/* World caption */}
      {world && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <p className="whitespace-nowrap font-mono text-[11px] text-muted">
            {world.meta.topic} · {world.meta.node_count} entities ·{' '}
            {world.meta.edge_count} connections
          </p>
        </div>
      )}

      {/* Layer bar — top-left */}
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <div className="pointer-events-auto">
          <LayerBar active={activeLayers} onToggle={handleToggleLayer} />
        </div>
      </div>

      {/* Actions — top-right */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <CreditPill used={credits.used} total={credits.total} />
        <SerendipityButton onSurprise={handleSurprise} disabled={!world} />
        <button
          type="button"
          aria-expanded={simOpen}
          onClick={() => {
            setSimOpen((open) => {
              if (!open) {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }
              return !open;
            });
          }}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium backdrop-blur-md transition-colors ${
            simOpen
              ? 'border-gold/60 bg-gold/15 text-gold'
              : 'border-line bg-surface/80 text-ink hover:border-gold/60 hover:text-gold'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M9 2L4 9h3l-1 5 5-7H8l1-5z" strokeLinejoin="round" />
          </svg>
          Simulate
        </button>
      </div>

      {/* Time slider — bottom-center */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <TimeSlider year={year} onChange={handleYearChange} />
      </div>

      {/* Node panel — right sheet */}
      {selectedNode && (
        <div className="absolute right-0 top-0 z-20 h-full">
          <NodePanel
            node={selectedNode}
            connections={connections}
            expanding={expandingId === selectedNode.id}
            budgetExhausted={budgetExhausted}
            expandEmpty={expandEmptyIds.has(selectedNode.id)}
            onExpand={handleExpand}
            onJump={handleJump}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      )}

      {/* Edge panel — bottom sheet */}
      {selectedEdge && !selectedNode && (
        <div className="absolute bottom-0 left-1/2 z-20 w-full max-w-3xl -translate-x-1/2 px-4">
          <EdgePanel
            edge={selectedEdge}
            sourceName={nodesById.get(selectedEdge.source)?.name ?? selectedEdge.source}
            targetName={nodesById.get(selectedEdge.target)?.name ?? selectedEdge.target}
            onClose={() => setSelectedEdgeId(null)}
          />
        </div>
      )}

      {/* Simulator — left overlay */}
      {simOpen && (
        <div className="absolute left-0 top-0 z-20 h-full">
          <SimulatorPanel
            simulating={simulating}
            items={cascadeItems}
            onSimulate={handleSimulate}
            onReset={handleResetSim}
            onClose={() => setSimOpen(false)}
          />
        </div>
      )}

      {/* Toast */}
      <div className="absolute bottom-20 right-4 z-30">
        <Toast
          message={toast?.message ?? null}
          kind={toast?.kind ?? 'info'}
          onDismiss={dismissToast}
        />
      </div>

      {/* Loading */}
      {loading && !world && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-void/80 backdrop-blur-sm">
          <div className="w-full max-w-sm px-6 text-center">
            <p className="text-[28px] font-bold tracking-[-0.02em]">GENESIS</p>
            <div className="skeleton-shimmer mt-6 h-2 w-full rounded-full" />
            <div className="mt-6 space-y-2 text-left">
              <p className="animate-fade-in text-[13px] text-muted">
                Seeding the universe…
              </p>
              <p
                className="animate-fade-in text-[13px] text-muted"
                style={{ animationDelay: '600ms' }}
              >
                Categories blooming…
              </p>
              <p
                className="animate-fade-in text-[13px] text-muted"
                style={{ animationDelay: '1200ms' }}
              >
                Weaving connections…
              </p>
            </div>
          </div>
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
              className="mt-4 rounded-xl bg-gold px-6 py-2.5 text-[14px] font-semibold text-void"
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
    </main>
  );
}

export default function WorldPage() {
  return (
    <Suspense
      fallback={
        <main className="vignette fixed inset-0 grid place-items-center bg-void text-ink">
          <p className="text-sm text-muted">Preparing universe…</p>
        </main>
      }
    >
      <WorldView />
    </Suspense>
  );
}
