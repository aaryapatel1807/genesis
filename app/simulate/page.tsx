'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  FlaskConical,
  Play,
  RotateCcw,
  Scale,
  TriangleAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import type {
  CascadeSeverity,
  GEdge,
  GNode,
  SimulateResponse,
  World,
} from '@/lib/types';

/* Variables -------------------------------------------------------------- */

const SLIDER_DEFS = [
  {
    key: 'aiInvestment',
    label: 'AI Investment',
    hint: 'Capital flowing into AI labs & startups',
    icon: TrendingUp,
  },
  {
    key: 'regulation',
    label: 'Regulation Pressure',
    hint: 'Policy, compliance & oversight burden',
    icon: Scale,
  },
  {
    key: 'talent',
    label: 'Talent Supply',
    hint: 'Available researchers & engineers',
    icon: Users,
  },
  {
    key: 'compute',
    label: 'Compute Cost',
    hint: 'Price of training & inference compute',
    icon: Cpu,
  },
] as const;

type SliderKey = (typeof SLIDER_DEFS)[number]['key'];
type SliderState = Record<SliderKey, number>;

const DEFAULT_SLIDERS: SliderState = {
  aiInvestment: 0,
  regulation: 0,
  talent: 0,
  compute: 0,
};

const fmtDelta = (v: number): string => `${v > 0 ? '+' : ''}${v}%`;

/* Simulated outcome graph (lightweight SVG) ------------------------------ */

const SEV_RANK: Record<CascadeSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

interface SimGraphProps {
  nodes: GNode[];
  edges: GEdge[];
  severityOf: Map<string, CascadeSeverity>;
}

function SimGraph({ nodes, edges, severityOf }: SimGraphProps): React.JSX.Element {
  const W = 420;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2 - 6;
  const R = 96;

  const pos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      map.set(n.id, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
    });
    return map;
  }, [nodes]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-gold/50 bg-void/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
        Simulation
      </span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Simulated outcome network: ${nodes.length} affected entities, ${edges.length} cascade links`}
      >
        {edges.map((e) => {
          const s = pos.get(e.source);
          const t = pos.get(e.target);
          if (!s || !t) return null;
          return (
            <line
              key={e.id}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="var(--gold)"
              strokeOpacity={0.28}
              strokeWidth={1.25}
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const sev = severityOf.get(n.id);
          const ring = sev === 'critical' || sev === 'high';
          const r = Math.max(5, Math.min(11, 4 + Math.sqrt(Math.max(n.influence, 0)) / 2.2));
          return (
            <a key={n.id} href={`/entity/${n.id}`}>
              <title>
                {n.name} — {sev ? `${sev} severity` : 'affected'}
              </title>
              {ring ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 6}
                  fill="none"
                  stroke="var(--gold)"
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                />
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={`var(--n-${n.type})`}
                fillOpacity={0.9}
                style={{ filter: `drop-shadow(0 0 6px var(--n-${n.type}))` }}
              />
              <text
                x={p.x}
                y={p.y + r + 11}
                textAnchor="middle"
                fontSize={9}
                fill="var(--muted)"
                fontFamily="'JetBrains Mono', monospace"
              >
                {n.name.length > 14 ? `${n.name.slice(0, 13)}…` : n.name}
              </text>
            </a>
          );
        })}
      </svg>
      <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Hypothetical cascade — not a factual prediction
      </p>
    </div>
  );
}

/* Confidence meter row ---------------------------------------------------- */

interface MeterProps {
  label: string;
  value: string;
  pct: number;
  colorVar: string;
}

function Meter({ label, value, pct, colorVar }: MeterProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <span className="font-mono text-[12px]" style={{ color: colorVar }}>
          {value}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${clamped}%`, background: colorVar }}
        />
      </div>
    </div>
  );
}

/* Page -------------------------------------------------------------------- */

export default function SimulatePage(): React.JSX.Element {
  const router = useRouter();
  const { container, enterUp, enter } = useMotionVariants();

  const [world, setWorld] = useState<World | null>(null);
  const [sliders, setSliders] = useState<SliderState>(DEFAULT_SLIDERS);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/world')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: World | null) => {
        if (alive && data) setWorld(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scenario =
        `What-if vs baseline: AI investment ${fmtDelta(sliders.aiInvestment)}, ` +
        `regulation pressure ${fmtDelta(sliders.regulation)}, ` +
        `talent supply ${fmtDelta(sliders.talent)}, ` +
        `compute cost ${fmtDelta(sliders.compute)}.`;
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = (await res.json()) as SimulateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Simulation failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [sliders]);

  const reset = useCallback(() => {
    setSliders(DEFAULT_SLIDERS);
    setResult(null);
    setError(null);
  }, []);

  const byId = useMemo(
    () => new Map<string, GNode>((world?.nodes ?? []).map((n) => [n.id, n])),
    [world],
  );

  const severityOf = useMemo(() => {
    const m = new Map<string, CascadeSeverity>();
    for (const c of result?.cascades ?? []) {
      const cur = m.get(c.nodeId);
      if (!cur || SEV_RANK[c.severity] > SEV_RANK[cur]) m.set(c.nodeId, c.severity);
    }
    return m;
  }, [result]);

  const simNodes = useMemo(() => {
    const list = (result?.affected ?? [])
      .map((id) => byId.get(id))
      .filter((n): n is GNode => n !== undefined)
      .sort((a, b) => b.influence - a.influence);
    return list.slice(0, 16);
  }, [result, byId]);

  const affectedSet = useMemo(() => new Set(simNodes.map((n) => n.id)), [simNodes]);

  const simEdges = useMemo(
    () =>
      (world?.edges ?? [])
        .filter((e) => affectedSet.has(e.source) && affectedSet.has(e.target))
        .slice(0, 40),
    [world, affectedSet],
  );

  const nodeCount = world?.meta.node_count ?? 0;
  const avgConfidence = simNodes.length
    ? Math.round(simNodes.reduce((s, n) => s + n.reality.confidence, 0) / simNodes.length)
    : 0;

  const cascades = result?.cascades ?? [];
  const riskScore = cascades.length
    ? cascades.reduce((s, c) => s + (SEV_RANK[c.severity] + 1), 0) / (4 * cascades.length)
    : 0;
  const riskLabel =
    riskScore >= 0.75 ? 'Critical' : riskScore >= 0.55 ? 'High' : riskScore >= 0.35 ? 'Moderate' : 'Low';
  const riskColor =
    riskLabel === 'Critical' || riskLabel === 'High'
      ? 'var(--red)'
      : riskLabel === 'Moderate'
        ? 'var(--gold)'
        : 'var(--teal)';

  const topCascades = useMemo(
    () =>
      [...cascades]
        .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])
        .slice(0, 4),
    [cascades],
  );

  return (
    <AppShell chrome="app" title="Scenario Lab">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
        <motion.header variants={enterUp} initial="hidden" animate="show">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-teal">
            <FlaskConical size={14} aria-hidden="true" />
            What-if engine
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Scenario Lab
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Nudge the levers, then project a hypothetical cascade onto the world
            graph. Simulated outcomes are clearly labeled — never predictions.
          </p>
        </motion.header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]"
        >
          {/* (a) Variables ------------------------------------------------ */}
          <motion.section variants={enterUp} aria-label="Scenario variables">
            <GlassPanel title="Variables" className="h-full">
              <div className="space-y-5">
                {SLIDER_DEFS.map((def) => {
                  const Icon = def.icon;
                  const value = sliders[def.key];
                  return (
                    <div key={def.key}>
                      <div className="flex items-center gap-2">
                        <Icon size={14} aria-hidden="true" className="text-teal" />
                        <label
                          htmlFor={`slider-${def.key}`}
                          className="text-[13px] font-medium text-ink"
                        >
                          {def.label}
                        </label>
                        <span
                          className={cn(
                            'ml-auto font-mono text-[12px]',
                            value === 0 ? 'text-muted' : value > 0 ? 'text-teal' : 'text-gold',
                          )}
                        >
                          {fmtDelta(value)}
                        </span>
                      </div>
                      <input
                        id={`slider-${def.key}`}
                        type="range"
                        min={-100}
                        max={100}
                        step={5}
                        value={value}
                        onChange={(e) =>
                          setSliders((s) => ({ ...s, [def.key]: Number(e.target.value) }))
                        }
                        className="mt-2 w-full accent-gold"
                        aria-describedby={`hint-${def.key}`}
                      />
                      <p id={`hint-${def.key}`} className="mt-1 text-[11px] text-muted">
                        {def.hint}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 border-t border-line pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  loading={loading}
                  disabled={loading || !world}
                  onClick={run}
                  icon={<Play size={15} aria-hidden="true" />}
                >
                  Run Simulation
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={loading}
                  onClick={reset}
                  icon={<RotateCcw size={14} aria-hidden="true" />}
                >
                  Reset
                </Button>
                {!world ? (
                  <p className="text-center font-mono text-[10px] text-muted">
                    Loading world graph…
                  </p>
                ) : null}
              </div>
            </GlassPanel>
          </motion.section>

          {/* (b) Simulated outcome ---------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Simulated outcome">
            <GlassPanel title="Simulated Outcome" className="h-full">
              {error ? (
                <div className="flex items-start gap-3 rounded-xl border border-red/40 bg-red/10 p-4">
                  <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-red" />
                  <div>
                    <p className="text-[13px] font-medium text-ink">Simulation failed</p>
                    <p className="mt-1 text-[12px] text-muted">{error}</p>
                  </div>
                </div>
              ) : !result ? (
                <EmptyState
                  message={loading ? 'Projecting cascade…' : 'No simulation run yet'}
                  hint="Adjust the variables and press Run Simulation to project a hypothetical cascade."
                />
              ) : result.affected.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                  <TriangleAlert size={28} aria-hidden="true" className="text-gold" strokeWidth={1.5} />
                  <p className="max-w-sm text-sm text-muted">
                    {result.note ?? 'The simulator returned no affected entities.'}
                  </p>
                  <p className="max-w-sm font-mono text-[10px] uppercase tracking-[0.16em] text-muted/70">
                    {result.label}
                  </p>
                </div>
              ) : (
                <motion.div variants={enter}>
                  <SimGraph nodes={simNodes} edges={simEdges} severityOf={severityOf} />
                  <p className="mt-3 border-t border-line pt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted/70">
                    {result.label}
                  </p>
                </motion.div>
              )}
            </GlassPanel>
          </motion.section>

          {/* (c) Scenario confidence -------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Scenario confidence">
            <GlassPanel title="Scenario Confidence" className="h-full">
              {!result || result.affected.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-muted">
                  Run a simulation to populate confidence metrics.
                </p>
              ) : (
                <motion.div variants={enter} className="space-y-5">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                        Confidence
                      </span>
                      <span className="font-mono text-xl text-gold">{avgConfidence}%</span>
                    </div>
                    <div className="relative mt-2">
                      <div
                        className="h-3 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-label="Scenario confidence"
                        aria-valuenow={avgConfidence}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{
                          background:
                            'linear-gradient(90deg, var(--teal), var(--gold), var(--red))',
                          opacity: 0.85,
                        }}
                      />
                      <div
                        className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded bg-ink"
                        style={{ left: `calc(${avgConfidence}% - 1px)` }}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted">
                      Mean evidence confidence of affected entities
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-line pt-4">
                    <Meter
                      label="Outcome"
                      value={`${result.affected.length} / ${nodeCount} nodes`}
                      pct={nodeCount ? (result.affected.length / nodeCount) * 100 : 0}
                      colorVar="var(--teal)"
                    />
                    <Meter
                      label="Confidence"
                      value={`${avgConfidence}%`}
                      pct={avgConfidence}
                      colorVar="var(--gold)"
                    />
                    <Meter
                      label="Risk Level"
                      value={riskLabel}
                      pct={riskScore * 100}
                      colorVar={riskColor}
                    />
                  </div>

                  {topCascades.length > 0 ? (
                    <div className="border-t border-line pt-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                        Top cascades
                      </p>
                      <ul className="mt-2 space-y-2">
                        {topCascades.map((c, i) => (
                          <li key={`${c.nodeId}-${i}`} className="text-[12px] leading-relaxed">
                            <span
                              className={cn(
                                'mr-2 inline-block rounded border px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.12em]',
                                c.severity === 'critical' || c.severity === 'high'
                                  ? 'border-red/50 text-red'
                                  : c.severity === 'medium'
                                    ? 'border-gold/50 text-gold'
                                    : 'border-line text-muted',
                              )}
                            >
                              {c.severity}
                            </span>
                            <button
                              type="button"
                              onClick={() => router.push(`/entity/${c.nodeId}`)}
                              className="font-medium text-ink underline decoration-line underline-offset-2 transition-colors hover:text-gold"
                            >
                              {byId.get(c.nodeId)?.name ?? c.nodeId}
                            </button>
                            <span className="text-muted"> — {c.effect}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </GlassPanel>
          </motion.section>
        </motion.div>
      </div>
    </AppShell>
  );
}
