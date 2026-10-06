'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  FlaskConical,
  Play,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
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
  { key: 'aiInvestment', label: 'AI Investment', hint: 'Capital flowing into AI labs & startups' },
  { key: 'regulation', label: 'Regulation Pressure', hint: 'Policy, compliance & oversight burden' },
  { key: 'talent', label: 'Talent Supply', hint: 'Available researchers & engineers' },
  { key: 'compute', label: 'Compute Cost', hint: 'Price of training & inference compute' },
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

/* Simulated outcome graph — ring around an "Outcome" hub ------------------ */

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
  /** Multiplier from slider magnitudes — nodes grow with the scenario levers. */
  sizeScale: number;
}

function SimGraph({ nodes, edges, severityOf, sizeScale }: SimGraphProps): React.JSX.Element {
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
      {/* blur-glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--teal) 16%, transparent), transparent 62%)',
          filter: 'blur(28px)',
        }}
      />
      <span className="tag pointer-events-none absolute left-3 top-3 z-10 font-mono uppercase tracking-[0.2em]">
        Simulation
      </span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="relative h-auto w-full"
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
        {/* hub spokes */}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          return (
            <line
              key={`spoke-${n.id}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="var(--teal)"
              strokeOpacity={0.16}
              strokeWidth={1}
            />
          );
        })}
        {/* hub */}
        <circle
          cx={cx}
          cy={cy}
          r={26}
          fill="var(--teal)"
          fillOpacity={0.22}
          stroke="var(--teal)"
          strokeWidth={1.5}
          style={{ filter: 'drop-shadow(0 0 14px var(--teal))' }}
        />
        <text
          x={cx}
          y={cy + 44}
          textAnchor="middle"
          fontSize={11}
          fill="var(--teal)"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing={2}
        >
          Outcome
        </text>
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const sev = severityOf.get(n.id);
          const hot = sev === 'critical' || sev === 'high';
          const colorVar = hot ? 'var(--amber)' : 'var(--teal)';
          const r =
            Math.max(5, Math.min(11, 4 + Math.sqrt(Math.max(n.influence, 0)) / 2.2)) *
            sizeScale;
          return (
            <a key={n.id} href={`/entity/${n.id}`}>
              <title>
                {n.name} — {sev ? `${sev} severity` : 'affected'}
              </title>
              {hot ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 6}
                  fill="none"
                  stroke={colorVar}
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                />
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={colorVar}
                fillOpacity={0.9}
                style={{ filter: `drop-shadow(0 0 6px ${colorVar})` }}
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

/* Confidence gauge -------------------------------------------------------- */

function ConfidenceGauge({ pct }: { pct: number }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const arcLen = Math.PI * 80;
  const filled = (clamped / 100) * arcLen;
  return (
    <svg
      viewBox="0 0 200 118"
      className="w-full"
      role="progressbar"
      aria-label="Scenario confidence"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <defs>
        <linearGradient id="conf-gauge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--teal)" />
          <stop offset="100%" stopColor="var(--amber)" />
        </linearGradient>
      </defs>
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke="var(--line)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke="url(#conf-gauge-grad)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`}
      />
      <text
        x="100"
        y="90"
        textAnchor="middle"
        fill="var(--cream)"
        fontSize="26"
        fontFamily="'JetBrains Mono', monospace"
      >
        {clamped}%
      </text>
    </svg>
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

  /** Node radius multiplier from slider magnitudes — levers visibly resize the graph. */
  const sizeScale = useMemo(() => {
    const vals = Object.values(sliders);
    const meanAbs = vals.reduce((s, v) => s + Math.abs(v), 0) / vals.length;
    return 1 + meanAbs / 150;
  }, [sliders]);

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
          className="cols c3 mt-6"
        >
          {/* (a) Variables ------------------------------------------------ */}
          <motion.section variants={enterUp} aria-label="Scenario variables">
            <div className="glass h-full">
              <h4>Variables</h4>
              <div>
                {SLIDER_DEFS.map((def) => {
                  const value = sliders[def.key];
                  return (
                    <div key={def.key}>
                      <div className="row">
                        <label htmlFor={`slider-${def.key}`} className="text-[13px] text-ink">
                          {def.label}
                        </label>
                        <span
                          className={cn(
                            'mono amber text-[12px]',
                            value === 0 && 'mut',
                          )}
                          aria-live="polite"
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
                        className="mt-2"
                        aria-describedby={`hint-${def.key}`}
                      />
                      <p id={`hint-${def.key}`} className="mut mt-1 text-[11px]">
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
                  <p className="mono mut text-center text-[10px]">
                    Loading world graph…
                  </p>
                ) : null}
              </div>
            </div>
          </motion.section>

          {/* (b) Simulated outcome ---------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Simulated outcome">
            <div className="glass h-full">
              <h4>Simulated outcome</h4>
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
                  <p className="mono mut max-w-sm text-[10px] uppercase tracking-[0.16em]">
                    {result.label}
                  </p>
                </div>
              ) : (
                <motion.div variants={enter}>
                  <SimGraph
                    nodes={simNodes}
                    edges={simEdges}
                    severityOf={severityOf}
                    sizeScale={sizeScale}
                  />
                  <p className="mono mut mt-3 border-t border-line pt-3 text-center text-[10px] uppercase tracking-[0.16em]">
                    {result.label}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* (c) Scenario confidence -------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Scenario confidence">
            <div className="glass h-full">
              <h4>Scenario confidence</h4>
              {!result || result.affected.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-muted">
                  Run a simulation to populate confidence metrics.
                </p>
              ) : (
                <motion.div variants={enter} className="space-y-5">
                  <div>
                    <ConfidenceGauge pct={avgConfidence} />
                    <p className="mut mt-1.5 text-[11px]">
                      Mean evidence confidence of affected entities — the gradient
                      runs from teal (low) to amber (high).
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
            </div>
          </motion.section>
        </motion.div>
      </div>
    </AppShell>
  );
}
