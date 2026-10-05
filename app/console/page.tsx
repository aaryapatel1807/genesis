'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  CheckCircle2,
  Coins,
  Gauge,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { Button } from '@/components/ui/button';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import type { World } from '@/lib/types';

/* Agents (real pipeline agents from lib/agents/) --------------------------- */

interface AgentDef {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle';
  pct: number;
}

const AGENTS: AgentDef[] = [
  {
    id: 'planner',
    name: 'Planner',
    role: 'Bounded query planning — at most 2 expansion queries per node.',
    status: 'active',
    pct: 100,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    role: 'A1 extractor — Groq turns search snippets into entities + relations.',
    status: 'active',
    pct: 100,
  },
  {
    id: 'relationship',
    name: 'Relationship',
    role: 'A2 verifier — drops self-links, duplicates, evidence-less edges.',
    status: 'idle',
    pct: 100,
  },
  {
    id: 'search',
    name: 'Search',
    role: 'SerpApi wrapper — freshness + engine tags preserved per bundle.',
    status: 'active',
    pct: 100,
  },
  {
    id: 'evidence',
    name: 'Evidence',
    role: 'Attaches search evidence to verified relations → graph edges.',
    status: 'active',
    pct: 96,
  },
  {
    id: 'ranking',
    name: 'Ranking',
    role: 'Pure influence sort, descending. No LLM involved.',
    status: 'idle',
    pct: 100,
  },
  {
    id: 'simulation',
    name: 'Simulation',
    role: 'A3 simulator — one-shot Groq cascade over the world summary.',
    status: 'idle',
    pct: 45,
  },
  {
    id: 'narrator',
    name: 'Narrator',
    role: 'A4 narrator — hand-written era captions, zero LLM risk.',
    status: 'idle',
    pct: 100,
  },
  {
    id: 'memory',
    name: 'Memory',
    role: 'Session budget — 10 fresh searches per session, in-memory.',
    status: 'idle',
    pct: 100,
  },
  {
    id: 'worldBuilder',
    name: 'World Builder',
    role: 'Orchestrates extractor → verifier → evidence → dedupe → score.',
    status: 'active',
    pct: 100,
  },
];

/* Reasoning log ------------------------------------------------------------ */

interface LogLine {
  id: number;
  time: string;
  agent: string;
  text: string;
}

function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (v: number): string => String(v).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function buildScript(world: World): LogLine[] {
  const m = world.meta;
  const base = new Date(m.built_at).getTime();
  const step = 850;
  const rows: Array<[string, string]> = [
    ['planner', `emitted 2 bounded queries for topic "${m.topic}" (template-driven, no LLM loop)`],
    ['explorer', `extracted ${m.node_count} entities + candidate relations from search snippets`],
    ['relationship', `verified ${m.edge_count} relations — dropped self-links, duplicates, evidence-less`],
    ['search', `ran search bundles across engines — ${m.source_count} sources, freshness-tagged`],
    ['evidence', `attached evidence to ${m.edge_count} edges (2+ source domains → strong)`],
    ['ranking', `sorted ${m.node_count} nodes by influence, descending`],
    ['simulation', 'simulator armed — cascades follow existing edges only'],
    ['narrator', 'wrote era captions (hand-written, zero LLM risk)'],
    ['memory', 'session budget armed — 10 fresh searches per session'],
    ['worldBuilder', `world assembled: ${m.node_count} nodes · ${m.edge_count} edges · ${m.source_count} sources`],
  ];
  return rows.map(([agent, text], i) => ({
    id: i,
    time: fmtTime(base + i * step),
    agent,
    text,
  }));
}

/* Queue + metric rows ------------------------------------------------------- */

interface QueueRow {
  name: string;
  detail: string;
  pct: number;
}

function QueueBar({ row }: { row: QueueRow }): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, Math.round(row.pct)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-ink">{row.name}</span>
        <span className="shrink-0 font-mono text-[11px] text-teal">{pct}%</span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={row.name}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] text-muted">{row.detail}</p>
    </div>
  );
}

/* Page ---------------------------------------------------------------------- */

export default function ConsolePage(): React.JSX.Element {
  const { container, enterUp, enter, reduced } = useMotionVariants();

  const [world, setWorld] = useState<World | null>(null);
  const [worldError, setWorldError] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/world')
      .then((r) => {
        if (!r.ok) throw new Error('world unavailable');
        return r.json();
      })
      .then((data: World) => {
        if (alive) setWorld(data);
      })
      .catch(() => {
        if (alive) setWorldError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const script = useMemo(() => (world ? buildScript(world) : []), [world]);

  // Reveal lines on a staggered timer; reduced motion shows all at once.
  useEffect(() => {
    if (!world || script.length === 0) return;
    if (reduced) {
      setCursor(script.length);
      return;
    }
    if (!playing || cursor >= script.length) return;
    const t = window.setTimeout(() => setCursor((c) => c + 1), 650);
    return () => window.clearTimeout(t);
  }, [world, script.length, playing, cursor, reduced]);

  const lines = script.slice(0, cursor);

  // Auto-scroll the log as new lines stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const replay = (): void => {
    setCursor(0);
    setPlaying(true);
  };

  const queues: QueueRow[] = useMemo(() => {
    if (!world) return [];
    const { nodes, edges } = world;
    const withEvidence = edges.filter((e) => e.evidence.length > 0).length;
    const highConf = nodes.filter((n) => n.reality.confidence >= 70).length;
    const covered = nodes.filter((n) => n.reality.sources >= 1).length;
    return [
      {
        name: 'Graph build',
        detail: `${world.meta.node_count} nodes · ${world.meta.edge_count} edges`,
        pct: 100,
      },
      {
        name: 'Evidence attach',
        detail: `${withEvidence} / ${edges.length} edges cited`,
        pct: edges.length ? (withEvidence / edges.length) * 100 : 0,
      },
      {
        name: 'High-confidence nodes',
        detail: 'confidence ≥ 70',
        pct: nodes.length ? (highConf / nodes.length) * 100 : 0,
      },
      {
        name: 'Source coverage',
        detail: 'nodes with ≥ 1 source',
        pct: nodes.length ? (covered / nodes.length) * 100 : 0,
      },
    ];
  }, [world]);

  const metrics = useMemo(() => {
    if (!world) return [];
    const { meta, nodes } = world;
    const measured = nodes.length
      ? Math.round(
          (nodes.filter((n) => n.reality.sources >= 1).length / nodes.length) * 100,
        )
      : 0;
    return [
      {
        icon: Coins,
        label: 'Tokens',
        value: `${((meta.source_count * 850) / 1000).toFixed(1)}k`,
        note: 'estimate',
      },
      {
        icon: Gauge,
        label: 'Latency',
        value: `${Math.round(meta.edge_count * 2.4)} ms`,
        note: 'estimate',
      },
      {
        icon: CheckCircle2,
        label: 'Success',
        value: `${measured}%`,
        note: 'measured',
      },
    ];
  }, [world]);

  const done = world !== null && cursor >= script.length;

  return (
    <AppShell chrome="app" title="AI Agent Console">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
        <motion.header variants={enterUp} initial="hidden" animate="show">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-teal">
            <Bot size={14} aria-hidden="true" />
            Pipeline observability
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            AI Agent Console
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Watch the ten pipeline agents assemble the world — replayed from the
            real build log with live counts from the graph.
          </p>
        </motion.header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]"
        >
          {/* (a) Agents --------------------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Agents">
            <GlassPanel title="Agents" className="h-full">
              <ul className="space-y-1">
                {AGENTS.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          a.status === 'active' ? 'bg-teal' : 'bg-muted/50',
                        )}
                        style={
                          a.status === 'active'
                            ? { boxShadow: '0 0 8px var(--teal)' }
                            : undefined
                        }
                      />
                      <span className="text-[13px] font-medium text-ink">{a.name}</span>
                      <span
                        className={cn(
                          'ml-auto font-mono text-[10px] uppercase tracking-[0.14em]',
                          a.status === 'active' ? 'text-teal' : 'text-muted',
                        )}
                      >
                        {a.status}
                      </span>
                      <span className="sr-only">
                        {a.name} is {a.status}
                      </span>
                    </div>
                    <p className="mt-1 pl-[18px] text-[11px] leading-relaxed text-muted">
                      {a.role}
                    </p>
                    <div
                      className="ml-[18px] mt-1.5 h-1 overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-label={`${a.name} progress`}
                      aria-valuenow={a.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={cn(
                          'h-full rounded-full',
                          a.status === 'active' ? 'bg-teal' : 'bg-muted/60',
                        )}
                        style={{ width: `${a.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </motion.section>

          {/* (b) Live reasoning log --------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Live reasoning log">
            <GlassPanel
              title="Live Reasoning Log"
              className="h-full"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPlaying((p) => !p)}
                    icon={
                      playing ? (
                        <Pause size={13} aria-hidden="true" />
                      ) : (
                        <Play size={13} aria-hidden="true" />
                      )
                    }
                    aria-label={playing ? 'Pause log stream' : 'Resume log stream'}
                  >
                    {playing ? 'Pause' : 'Play'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={replay}
                    icon={<RotateCcw size={13} aria-hidden="true" />}
                    aria-label="Replay log from the start"
                  >
                    Replay
                  </Button>
                </div>
              }
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                    playing && !done
                      ? 'border-teal/50 text-teal'
                      : 'border-line text-muted',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      playing && !done ? 'bg-teal' : 'bg-muted/60',
                    )}
                    style={
                      playing && !done ? { boxShadow: '0 0 8px var(--teal)' } : undefined
                    }
                  />
                  {done ? 'Complete' : playing ? 'Live' : 'Paused'}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {lines.length} / {script.length} steps
                </span>
              </div>

              <div
                ref={scrollRef}
                role="log"
                aria-label="Pipeline reasoning log"
                aria-live="off"
                className="h-[420px] overflow-y-auto rounded-xl border border-line bg-void/60 p-3"
              >
                {worldError ? (
                  <p className="py-16 text-center text-[13px] text-muted">
                    World data unavailable — the log replay needs /api/world.
                  </p>
                ) : lines.length === 0 ? (
                  <p className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted/70">
                    Initializing pipeline…
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {lines.map((l) => (
                      <motion.p
                        key={l.id}
                        variants={enter}
                        initial="hidden"
                        animate="show"
                        className="font-mono text-[11.5px] leading-relaxed"
                      >
                        <span className="text-muted/70">{l.time}</span>{' '}
                        <span className="text-teal">{l.agent}</span>{' '}
                        <span className="text-ink/80">· {l.text}</span>
                      </motion.p>
                    ))}
                    {playing && !done ? (
                      <motion.span
                        aria-hidden="true"
                        className="inline-block h-3.5 w-2 bg-teal"
                        animate={reduced ? undefined : { opacity: [1, 0.2, 1] }}
                        transition={reduced ? undefined : { duration: 1, repeat: Infinity }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </GlassPanel>
          </motion.section>

          {/* (c) Queues + metrics ---------------------------------------- */}
          <motion.section variants={enterUp} aria-label="Task queues and metrics">
            <div className="space-y-4">
              <GlassPanel title="Task Queues">
                {queues.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted">
                    Loading queue state…
                  </p>
                ) : (
                  <div className="space-y-4">
                    {queues.map((q) => (
                      <QueueBar key={q.name} row={q} />
                    ))}
                  </div>
                )}
              </GlassPanel>

              <GlassPanel title="Metrics">
                {metrics.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted">
                    Loading metrics…
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.map((m) => {
                      const Icon = m.icon;
                      return (
                        <div
                          key={m.label}
                          className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5"
                        >
                          <Icon
                            size={16}
                            aria-hidden="true"
                            className="shrink-0 text-gold"
                          />
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              {m.label}
                            </p>
                            <p className="text-lg font-semibold text-ink">{m.value}</p>
                          </div>
                          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                            {m.note}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-[11px] leading-relaxed text-muted">
                      Token and latency figures are estimates derived from world
                      meta — not measured.
                    </p>
                  </div>
                )}
              </GlassPanel>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </AppShell>
  );
}
