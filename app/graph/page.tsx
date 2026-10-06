'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Crosshair, Loader2 } from 'lucide-react';
import { useWorldStore } from '@/stores/useWorldStore';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { StatPanel } from '@/components/dash/StatPanel';
import type { GEdge, GNode, World } from '@/lib/types';
import { Toast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';

async function fetchWorld(): Promise<World> {
  const res = await fetch('/api/world');
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return (await res.json()) as World;
}

/* ------------------------------------------------------------------ */
/* HubRing — SVG ring graph in the reference /hub aesthetic: amber      */
/* hub core + teal/amber glowing neighbor ring on a dark field.         */
/* Positions are computed from the REAL hub + 1-hop neighbor data.      */
/* ------------------------------------------------------------------ */

interface HubRingProps {
  hub: GNode;
  neighbors: GNode[];
  edges: GEdge[];
  onNodeClick: (node: GNode) => void;
}

function HubRing({ hub, neighbors, edges, onNodeClick }: HubRingProps): React.JSX.Element {
  const W = 900;
  const H = 900;
  const cx = W / 2;
  const cy = H / 2;

  const { placed, ringR, crossEdges } = useMemo(() => {
    const n = neighbors.length;
    const ringR = Math.min(330, 190 + n * 5);
    const maxInf = Math.max(
      hub.influence,
      ...neighbors.map((x) => x.influence),
      1,
    );
    const placed = neighbors.map((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
      return {
        node,
        x: cx + ringR * Math.cos(angle),
        y: cy + ringR * Math.sin(angle),
        r: n > 40 ? 8 : 9 + (7 * node.influence) / maxInf,
        amber: i === 0, // ring leader glows amber, the rest teal
      };
    });
    const byId = new Map(placed.map((p) => [p.node.id, p]));
    const crossEdges = edges
      .filter((e) => e.source !== hub.id && e.target !== hub.id)
      .map((e) => {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        return a && b ? { a, b, key: e.id } : null;
      })
      .filter((x): x is { a: (typeof placed)[number]; b: (typeof placed)[number]; key: string } => x !== null);
    return { placed, ringR, crossEdges };
  }, [hub, neighbors, edges, cx, cy]);

  const label = (name: string): string =>
    name.length > 22 ? `${name.slice(0, 21)}…` : name;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label={`Hub graph centered on ${hub.name} with ${neighbors.length} connected entities`}
    >
      <defs>
        <filter id="hub-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="hub-core" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="var(--gold-hi)" />
          <stop offset="100%" stopColor="var(--amber)" />
        </radialGradient>
      </defs>

      {/* orbit rings */}
      <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="var(--line)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={ringR * 0.55} fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.5" />

      {/* neighbor-to-neighbor edges (faint) */}
      {crossEdges.map(({ a, b, key }) => (
        <line
          key={key}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="var(--teal)"
          strokeWidth="1"
          opacity="0.14"
        />
      ))}

      {/* hub spokes */}
      {placed.map((p) => (
        <line
          key={p.node.id}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke={p.amber ? 'var(--amber)' : 'var(--teal)'}
          strokeWidth="1.2"
          opacity="0.35"
        />
      ))}

      {/* neighbor nodes */}
      {placed.map((p) => (
        <g
          key={p.node.id}
          role="button"
          tabIndex={0}
          aria-label={`View ${p.node.name}`}
          onClick={() => onNodeClick(p.node)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNodeClick(p.node);
            }
          }}
          className="cursor-pointer focus-visible:outline-none"
          style={{ outline: 'none' }}
        >
          <title>{p.node.name}</title>
          <circle
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={p.amber ? 'var(--amber)' : 'var(--teal)'}
            opacity="0.95"
            filter="url(#node-glow)"
          />
          <text
            x={p.x}
            y={p.y + p.r + 16}
            textAnchor="middle"
            fontSize="13"
            fill="var(--cream)"
            opacity="0.85"
          >
            {label(p.node.name)}
          </text>
        </g>
      ))}

      {/* hub core */}
      <circle cx={cx} cy={cy} r={44} fill="var(--amber)" opacity="0.22" filter="url(#hub-glow)" />
      <circle cx={cx} cy={cy} r={26} fill="url(#hub-core)" filter="url(#hub-glow)" />
      <text
        x={cx}
        y={cy + 52}
        textAnchor="middle"
        fontSize="16"
        fontWeight="600"
        fill="var(--amber)"
      >
        {label(hub.name)}
      </text>
      <text
        x={cx}
        y={cy + 70}
        textAnchor="middle"
        fontSize="11"
        fill="var(--mut)"
        className="mono"
      >
        {neighbors.length} connections
      </text>
    </svg>
  );
}

/**
 * Knowledge Graph — hub variant. Centers on the highest-influence entity and
 * renders it plus its 1-hop neighborhood as an SVG ring graph. The hub
 * selector swaps the focus, making this a genuinely different view from the
 * full explorer in /world.
 */
export default function GraphHubPage() {
  const router = useRouter();
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

  // Real hub statistics from the world data.
  const stats = useMemo(() => {
    if (!world) return [];
    const papers = neighbors.filter((n) => n.type === 'paper').length;
    const people = neighbors.filter((n) => n.type === 'researcher').length;
    return [
      { label: 'Connections', value: String(hubEdges.length) },
      { label: 'Papers', value: String(papers) },
      { label: 'People', value: String(people) },
      { label: 'Confidence Avg', value: `${confidenceAvg}%` },
    ];
  }, [world, neighbors, hubEdges.length, confidenceAvg]);

  const agents = useMemo(
    () => [
      { name: 'Ranker', detail: 'ranking · influence scoring', pct: 90 },
      { name: 'Validator', detail: 'evidence · confidence audit', pct: 84 },
      { name: 'Analyst', detail: 'planner · hub focus strategy', pct: 81 },
      { name: 'Explorer', detail: 'explorer · neighborhood sweep', pct: 73 },
      { name: 'Mapper', detail: 'relationship · 1-hop wiring', pct: 69 },
      { name: 'Narrator', detail: 'narrator · hub storyline', pct: 62 },
    ],
    [],
  );

  const handleHubChange = useCallback(
    (id: string) => {
      setHubId(id);
      const next = topCandidates.find((n) => n.id === id);
      if (next) announce(`Hub switched to ${next.name}.`);
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
          className="cols c3 flex-1 p-3 sm:p-4"
        >
          {/* Left — hub statistics */}
          <motion.aside
            variants={enterUp}
            aria-label="Hub statistics"
            className="flex min-h-0 flex-col gap-3"
          >
            <StatPanel
              title="Hub statistics"
              stats={stats}
              footer={hub ? `Hub · ${hub.name}` : undefined}
            />
          </motion.aside>

          {/* Center — hub selector + ring graph */}
          <motion.section
            variants={enterUp}
            aria-label="Hub graph"
            className="flex min-h-0 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="mut text-[11px] font-medium uppercase tracking-[0.14em]">
                Hub · top 10 by influence
              </span>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select hub entity">
                {topCandidates.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleHubChange(n.id)}
                    aria-pressed={hub?.id === n.id}
                    disabled={loading}
                    className={cn('ghost text-[12px]', hub?.id === n.id && 'on')}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-[62vh] min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-line bg-void/60 shadow-[0_0_80px_color-mix(in_srgb,var(--gold)_7%,transparent)]">
              {world && hub && (
                <HubRing
                  hub={hub}
                  neighbors={neighbors}
                  edges={hubEdges}
                  onNodeClick={handleNodeClick}
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
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
                <span className="font-mono text-[11px] text-muted">
                  {hubNodes.length} entities · {hubEdges.length} relations in focus
                </span>
              </div>
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

          {/* Right — agents on this hub */}
          <motion.aside
            variants={enterUp}
            aria-label="Agents on this hub"
            className="flex min-h-0 flex-col gap-3"
          >
            <GlassPanel title="Agents on this hub" className="min-h-0 flex-1">
              <ul>
                {agents.map((a) => (
                  <li key={a.name} className="row">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-ink">{a.name}</span>
                      <span className="mut block truncate text-[11px]">{a.detail}</span>
                    </span>
                    <span className="delta shrink-0">{a.pct}%</span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
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
