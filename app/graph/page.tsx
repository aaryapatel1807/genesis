'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronDown, Crosshair, Loader2 } from 'lucide-react';
import { useWorldStore } from '@/stores/useWorldStore';
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
import type { GEdge, GNode, NodeType, World } from '@/lib/types';
import { Toast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';

const UniverseGraph = dynamic(
  () => import('@/components/UniverseGraph').then((m) => m.UniverseGraph),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center">
        <p className="text-sm text-muted">Focusing hub…</p>
      </div>
    ),
  },
) as unknown as React.ForwardRefExoticComponent<
  UniverseGraphProps & React.RefAttributes<UniverseGraphHandle>
>;

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

async function fetchWorld(): Promise<World> {
  const res = await fetch('/api/world');
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return (await res.json()) as World;
}

/**
 * Knowledge Graph — hub variant. Centers on the highest-influence entity and
 * renders it plus its 1-hop neighborhood. The hub selector swaps the focus,
 * making this a genuinely different view from the full explorer in /world.
 */
export default function GraphHubPage() {
  const router = useRouter();
  const graphHandleRef = useRef<UniverseGraphHandle | null>(null);
  const { container, enterUp } = useMotionVariants();
  const announce = useWorldStore((s) => s.announce);

  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hubId, setHubId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchWorld()
      .then((data) => {
        if (cancelled) return;
        setWorld(data);
        const top = [...data.nodes].sort((a, b) => b.influence - a.influence)[0];
        setHubId(top?.id ?? null);
        announce(
          `Hub view loaded: ${data.meta.node_count} entities, ${data.meta.edge_count} connections.`,
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError('The universe could not be loaded. Check your connection and retry.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [announce]);

  const topCandidates = useMemo(() => {
    if (!world) return [];
    return [...world.nodes].sort((a, b) => b.influence - a.influence).slice(0, 10);
  }, [world]);

  const hub = useMemo(() => {
    if (!world || topCandidates.length === 0) return null;
    return topCandidates.find((n) => n.id === hubId) ?? topCandidates[0] ?? null;
  }, [world, topCandidates, hubId]);

  // Hub + direct neighbors; edges survive only when both endpoints survive.
  const { hubNodes, hubEdges, neighbors } = useMemo(() => {
    if (!world || !hub) {
      return { hubNodes: [] as GNode[], hubEdges: [] as GEdge[], neighbors: [] as GNode[] };
    }
    const neighborIds = new Set<string>();
    for (const e of world.edges) {
      if (e.source === hub.id) neighborIds.add(e.target);
      else if (e.target === hub.id) neighborIds.add(e.source);
    }
    const byId = new Map(world.nodes.map((n) => [n.id, n]));
    const neighborNodes = [...neighborIds]
      .map((id) => byId.get(id))
      .filter((n): n is GNode => n !== undefined)
      .sort((a, b) => b.influence - a.influence);
    const keep = new Set([hub.id, ...neighborIds]);
    const edges = world.edges.filter((e) => keep.has(e.source) && keep.has(e.target));
    return {
      hubNodes: [hub, ...neighborNodes],
      hubEdges: edges,
      neighbors: neighborNodes,
    };
  }, [world, hub]);

  const confidenceAvg = useMemo(() => {
    if (hubNodes.length === 0) return 0;
    const sum = hubNodes.reduce((acc, n) => acc + n.reality.confidence, 0);
    return Math.round((sum / hubNodes.length) * 100);
  }, [hubNodes]);

  const stats = useMemo(() => {
    if (!world) return [];
    return [
      { label: 'Entities', value: String(hubNodes.length) },
      { label: 'Relations', value: String(hubEdges.length) },
      { label: 'Confidence Avg', value: `${confidenceAvg}%` },
    ];
  }, [world, hubNodes.length, hubEdges.length, confidenceAvg]);

  const agentGroups = useMemo(
    () => [
      [
        { name: 'Analyst', detail: 'planner · hub focus strategy', pct: 81 },
        { name: 'Explorer', detail: 'explorer · neighborhood sweep', pct: 73 },
        { name: 'Mapper', detail: 'relationship · 1-hop wiring', pct: 69 },
      ],
      [
        { name: 'Ranker', detail: 'ranking · influence scoring', pct: 90 },
        { name: 'Validator', detail: 'evidence · confidence audit', pct: 84 },
        { name: 'Narrator', detail: 'narrator · hub storyline', pct: 62 },
      ],
    ],
    [],
  );

  const handleHubChange = useCallback(
    (id: string) => {
      setHubId(id);
      const next = topCandidates.find((n) => n.id === id);
      if (next) {
        announce(`Hub switched to ${next.name}.`);
        // Re-center after the filtered graph re-renders.
        window.setTimeout(() => graphHandleRef.current?.flyTo(next.id), 60);
      }
    },
    [topCandidates, announce],
  );

  const handleNodeClick = useCallback(
    (node: GNode) => {
      router.push(`/entity/${node.id}`);
    },
    [router],
  );

  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void fetchWorld()
      .then((data) => {
        setWorld(data);
        const top = [...data.nodes].sort((a, b) => b.influence - a.influence)[0];
        setHubId(top?.id ?? null);
      })
      .catch(() => setLoadError('The universe could not be loaded. Check your connection and retry.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell chrome="app" title="Knowledge Graph">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid flex-1 grid-cols-1 gap-3 p-3 sm:p-4 xl:grid-cols-[264px_minmax(0,1fr)_264px]"
        >
          {/* Left — hub statistics + neighbors */}
          <motion.aside
            variants={enterUp}
            aria-label="Hub statistics"
            className="flex min-h-0 flex-col gap-3"
          >
            <StatPanel title="Knowledge Statistics" stats={stats} footer={hub ? `Hub · ${hub.name}` : undefined} />
            <GlassPanel title="Active Entities" className="min-h-0 flex-1">
              <ul className="flex flex-col gap-1">
                {neighbors.slice(0, 6).map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => handleHubChange(node.id)}
                      title={`Focus hub on ${node.name}`}
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
                          {node.type} · influence {node.influence}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </motion.aside>

          {/* Center — hub canvas + selector */}
          <motion.section
            variants={enterUp}
            aria-label="Hub graph"
            className="flex min-h-0 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <label htmlFor="hub-select" className="sr-only">
                  Select hub entity
                </label>
                <select
                  id="hub-select"
                  value={hub?.id ?? ''}
                  onChange={(e) => handleHubChange(e.target.value)}
                  disabled={loading || topCandidates.length === 0}
                  className="appearance-none rounded-full border border-gold/40 bg-surface/80 py-2 pl-4 pr-10 font-mono text-[12px] text-gold backdrop-blur-md transition-colors hover:border-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-50"
                >
                  {topCandidates.map((n) => (
                    <option key={n.id} value={n.id} className="bg-surface text-ink">
                      {n.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold"
                />
              </div>
              <span className="font-mono text-[11px] text-muted">
                {hubNodes.length} entities · {hubEdges.length} relations in focus
              </span>
            </div>

            <div className="relative h-[62vh] min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-line bg-void/60 shadow-[0_0_80px_rgba(245,185,66,0.07)]">
              {world && hub && (
                <UniverseGraph
                  ref={graphHandleRef}
                  nodes={hubNodes}
                  edges={hubEdges}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={() => undefined}
                  dimmed={new Set<string>()}
                  pulsing={new Set<string>()}
                  introReveal
                  interactive
                />
              )}
              {hub && (
                <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-gold/40 bg-void/80 px-3 py-1.5 backdrop-blur-md">
                  <Crosshair size={13} aria-hidden="true" className="text-gold" />
                  <span className="font-mono text-[11px] font-semibold text-gold">
                    HUB · {hub.name}
                  </span>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 grid place-items-center">
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 size={14} aria-hidden="true" className="animate-spin text-gold" />
                    Focusing hub…
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Right — pipeline agents */}
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

        {/* Load error */}
        {loadError && !loading && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-void/80">
            <div className="w-full max-w-sm rounded-[14px] border border-line bg-surface p-6 text-center">
              <p className="text-[15px] font-semibold">The universe is offline</p>
              <p className="mt-2 text-[13px] text-muted">{loadError}</p>
              <button
                type="button"
                onClick={retry}
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

        <div className="absolute bottom-20 right-4 z-30">
          <Toast />
        </div>
      </div>
    </AppShell>
  );
}
