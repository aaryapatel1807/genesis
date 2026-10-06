'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatPanel } from '@/components/dash/StatPanel';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { AgentChecklist } from '@/components/AgentChecklist';
import { cn } from '@/lib/cn';
import { useMotionVariants } from '@/lib/motion';
import { useWorldStore } from '@/stores/useWorldStore';
import type { ExpandResponse, GNode, World } from '@/lib/types';

const DEFAULT_PROMPT =
  'Analyze the impact of remote-work policies on urban mobility and carbon emissions in 2024';

/** Typical end-to-end generation time, used for the ETA footer only. */
const TYPICAL_SECONDS = 15;

type StepState = 'pending' | 'active' | 'done' | 'error';
type Phase = 'idle' | 'generating' | 'done' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  detail: string;
}

const PIPELINE: PipelineStep[] = [
  { id: 'prompt', label: 'Prompt', detail: 'Parsing the generation prompt' },
  { id: 'extract', label: 'Entity extraction', detail: 'Pulling entities from evidence' },
  { id: 'relations', label: 'Relationship mapping', detail: 'Linking entities into relations' },
  { id: 'simulate', label: 'Simulating scenarios', detail: 'Projecting scenario cascades' },
  { id: 'validate', label: 'Validation', detail: 'Verifying confidence and evidence' },
];

interface GenResult extends ExpandResponse {
  anchorName: string;
  anchorType: string;
}

function makeSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Pick the world node most relevant to the prompt as the expansion anchor. */
function pickAnchor(world: World, promptText: string): GNode {
  if (world.nodes.length === 0) {
    throw new Error('The universe is empty — there is nothing to expand from yet.');
  }
  const words = promptText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  let best: GNode | null = null;
  let bestScore = -1;
  for (const n of world.nodes) {
    const hay = `${n.name} ${n.description}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = n;
    }
  }
  if (best !== null && bestScore > 0) return best;
  return [...world.nodes].sort((a, b) => b.influence - a.influence)[0] as GNode;
}

const STATUS_COPY: Record<StepState, { label: string; className: string }> = {
  done: { label: 'Complete', className: 'text-teal' },
  active: { label: 'In progress', className: 'text-gold' },
  pending: { label: 'Pending', className: 'text-muted/70' },
  error: { label: 'Failed', className: 'text-red' },
};

/**
 * Maps the real expansion pipeline step to the AgentChecklist beat it most
 * closely corresponds to. The checklist's finale ("World Ready") is driven
 * by the page phase becoming 'done'.
 */
const PIPELINE_TO_AGENT: Record<string, string> = {
  prompt: 'planner',
  extract: 'explorer',
  relations: 'relationship',
  simulate: 'simulation',
  validate: 'simulation',
};

function dotClass(state: StepState): string {
  if (state === 'done') return 'dot done';
  if (state === 'active') return 'dot now';
  return 'dot';
}

/** Animated dashed connector between pipeline chips — lights teal as steps advance. */
function Connector({ lit, reduced }: { lit: boolean; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="ml-[26px] block h-5 w-px"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, var(--teal) 0 4px, transparent 4px 8px)',
        opacity: lit ? 0.9 : 0.22,
      }}
      animate={
        lit && !reduced ? { backgroundPositionY: ['0px', '16px'] } : { backgroundPositionY: '0px' }
      }
      transition={
        lit && !reduced
          ? { duration: 0.7, repeat: Infinity, ease: 'linear' }
          : { duration: 0.2 }
      }
    />
  );
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function GeneratorPage() {
  const { container, enterUp, reduced } = useMotionVariants();
  const announce = useWorldStore((s) => s.announce);

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [phase, setPhase] = useState<Phase>('idle');
  const [steps, setSteps] = useState<StepState[]>(() => PIPELINE.map(() => 'pending'));
  const [sessionId] = useState<string>(makeSessionId);
  const [anchorName, setAnchorName] = useState<string | null>(null);
  const [result, setResult] = useState<GenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finishedMs, setFinishedMs] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearInterval(t);
      pending.length = 0;
    };
  }, []);

  // Live elapsed ticker while generating.
  useEffect(() => {
    if (phase !== 'generating' || startedAt === null) return;
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
    return () => window.clearInterval(id);
  }, [phase, startedAt]);

  const generate = async (): Promise<void> => {
    if (phase === 'generating') return;
    setError(null);
    setResult(null);
    setFinishedMs(null);
    setPhase('generating');
    const t0 = Date.now();
    setStartedAt(t0);
    setElapsedMs(0);
    setSteps(['done', 'active', 'pending', 'pending', 'pending']);
    announce('Generation started');

    // Progress driver: nudge the pipeline forward while the request is in
    // flight (it holds at "Simulating scenarios" until the response lands).
    let idx = 1;
    const driver = window.setInterval(() => {
      idx += 1;
      if (idx >= 3) {
        window.clearInterval(driver);
        return;
      }
      setSteps((prev) =>
        prev.map((s, i): StepState => (i < idx ? 'done' : i === idx ? 'active' : s)),
      );
    }, 2600);
    timers.current.push(driver);

    try {
      const worldRes = await fetch('/api/world', { cache: 'no-store' });
      if (!worldRes.ok) {
        throw new Error(`Could not load the current universe (HTTP ${worldRes.status}).`);
      }
      const world = (await worldRes.json()) as World;
      const anchor = pickAnchor(world, prompt);
      setAnchorName(anchor.name);
      setSteps(['done', 'done', 'active', 'pending', 'pending']);
      announce(`Expanding from ${anchor.name}`);

      const res = await fetch('/api/world/expand', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ nodeId: anchor.id }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            'Session expansion budget exhausted — 10 fresh searches per session.',
          );
        }
        const msg = typeof data.error === 'string' ? data.error : 'Expansion failed.';
        throw new Error(msg);
      }
      const ok = data as ExpandResponse;

      window.clearInterval(driver);
      setSteps(PIPELINE.map((): StepState => 'done'));
      setResult({ ...ok, anchorName: anchor.name, anchorType: anchor.type });
      setFinishedMs(Date.now() - t0);
      setPhase('done');
      announce(
        `World generated: ${ok.addedNodes.length} new entities, ${ok.addedEdges.length} new relations.`,
      );
    } catch (e) {
      window.clearInterval(driver);
      setSteps((prev) => prev.map((s): StepState => (s === 'active' ? 'error' : s)));
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      setError(msg);
      setFinishedMs(Date.now() - t0);
      setPhase('error');
      announce(`Generation failed: ${msg}`);
    }
  };

  const etaSeconds = Math.max(0, TYPICAL_SECONDS - elapsedMs / 1000);
  const doneCount = steps.filter((s) => s === 'done').length;
  const progressPct = Math.round((doneCount / PIPELINE.length) * 100);
  const isGenerating = phase === 'generating';

  // Wire the real pipeline phase into the AgentChecklist: the currently
  // active pipeline step maps to its agent beat; 'done' lands the finale.
  const activeStepIdx = steps.findIndex((s) => s === 'active' || s === 'error');
  const agentPhase =
    phase === 'done'
      ? 'ready'
      : phase === 'generating' && activeStepIdx >= 0
        ? (PIPELINE_TO_AGENT[PIPELINE[activeStepIdx].id] ?? 'planner')
        : 'planner';

  return (
    <AppShell chrome="app" title="World Generator">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
        <motion.header variants={enterUp} initial="hidden" animate="show">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            World Generator
          </h1>
          <p className="mt-1 text-sm text-muted">
            Generate synthetic knowledge domains from prompt
          </p>
        </motion.header>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="cols c2 mt-6"
        >
          {/* Prompt panel */}
          <motion.section variants={enterUp} aria-label="Generation prompt">
            <div className="glass h-full">
              <h4>Prompt</h4>
              <label htmlFor="generator-prompt" className="sr-only">
                Generation prompt
              </label>
              <textarea
                id="generator-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                disabled={isGenerating}
                className="disabled:opacity-60"
              />
              <Button
                variant="primary"
                className="mt-4 w-full"
                loading={phase === 'generating'}
                onClick={generate}
                icon={<Sparkles size={16} aria-hidden="true" />}
              >
                {phase === 'generating' ? 'Generating…' : 'Generate World'}
              </Button>

              <div className="mt-4 border-t border-line/50 pt-4" aria-live="polite">
                {phase === 'error' && error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red/40 bg-red/10 p-3.5 text-sm text-ink"
                  >
                    <p className="font-medium text-red">Generation failed</p>
                    <p className="mt-1 text-muted">{error}</p>
                  </div>
                ) : result ? (
                  <div className="space-y-3">
                    <StatPanel
                      title="Generation Result"
                      stats={[
                        { label: 'New entities', value: `+${result.addedNodes.length}` },
                        { label: 'New relations', value: `+${result.addedEdges.length}` },
                        { label: 'Fresh searches', value: String(result.searchesUsed) },
                      ]}
                      footer={
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
                              result.cached
                                ? 'border-gold/50 text-gold'
                                : 'border-teal/50 text-teal',
                            )}
                          >
                            {result.cached ? 'Cached demo mode' : 'Live'}
                          </span>
                          <span>
                            Expanding from {result.anchorName} ({result.anchorType})
                          </span>
                        </span>
                      }
                    />
                    {result.note ? (
                      <p className="text-xs leading-relaxed text-muted">{result.note}</p>
                    ) : null}
                    {result.addedNodes.length > 0 ? (
                      <ul>
                        {result.addedNodes.slice(0, 6).map((n) => (
                          <li key={n.id} className="row">
                            <span className="truncate text-[13px] text-ink">{n.name}</span>
                            <span className="mono mut shrink-0 text-[10px] uppercase tracking-wider">
                              {n.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : phase === 'generating' ? (
                  <div className="space-y-4" aria-busy="true">
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <span aria-hidden="true" className="dot now" />
                      {anchorName
                        ? `Expanding from ${anchorName}…`
                        : 'Finding the best anchor node…'}
                    </p>
                    <AgentChecklist phase={agentPhase} />
                  </div>
                ) : (
                  <EmptyState
                    message="What world would you like to explore?"
                    hint="Describe any domain in plain language — the pipeline extracts entities, maps their relationships and grounds every claim in evidence."
                  >
                    <form
                      role="search"
                      className="search w-full"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void generate();
                      }}
                    >
                      <Search size={15} aria-hidden="true" className="shrink-0" />
                      <label htmlFor="generator-quick" className="sr-only">
                        Domain to explore
                      </label>
                      <input
                        id="generator-quick"
                        type="search"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. quantum computing supply chains…"
                        disabled={isGenerating}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={isGenerating || prompt.trim().length === 0}
                      >
                        Explore
                      </Button>
                    </form>
                  </EmptyState>
                )}
              </div>
            </div>
          </motion.section>

          <div className="stack">
            {/* Pipeline flow */}
            <motion.section variants={enterUp} aria-label="Generation pipeline">
              <div className="glass">
                <h4>Pipeline</h4>
                <ol aria-label="Generation pipeline steps">
                  {PIPELINE.map((step, i) => {
                    const state = steps[i] as StepState;
                    const status = STATUS_COPY[state];
                    const lit = state === 'done' || state === 'active';
                    return (
                      <li key={step.id}>
                        <div
                          className={cn(
                            'flex items-center gap-3 rounded-full border px-4 py-2.5',
                            lit ? 'border-teal/50' : 'border-line',
                          )}
                        >
                          <span aria-hidden="true" className={dotClass(state)} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">
                              {step.label}
                            </span>
                            <span className="block text-[11px] text-muted">
                              {step.detail}
                            </span>
                          </span>
                          <span className={cn('shrink-0 text-xs', status.className)}>
                            {status.label}
                          </span>
                        </div>
                        {i < PIPELINE.length - 1 ? (
                          <Connector lit={lit} reduced={reduced} />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </motion.section>

            {/* Steps checklist */}
            <motion.section variants={enterUp} aria-label="Generation steps">
              <div className="glass">
                <h4>Steps</h4>
                <ul>
                  {PIPELINE.map((step, i) => {
                    const state = steps[i] as StepState;
                    const status = STATUS_COPY[state];
                    return (
                      <li key={step.id} className="step">
                        <span aria-hidden="true" className={dotClass(state)} />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {step.label}
                        </span>
                        <span className={cn('shrink-0 text-xs', status.className)}>
                          {status.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div
                  className="bar g mt-3"
                  role="progressbar"
                  aria-label="Generation progress"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mono mut mt-2 text-[11px]" aria-live="polite">
                  {phase === 'generating'
                    ? `Elapsed ${formatSeconds(elapsedMs)} · ~${etaSeconds.toFixed(0)}s left (typical)`
                    : phase === 'done' && finishedMs !== null
                      ? `Completed in ${formatSeconds(finishedMs)}`
                      : phase === 'error' && finishedMs !== null
                        ? `Stopped after ${formatSeconds(finishedMs)}`
                        : 'Press Generate World to begin'}
                </p>
              </div>
            </motion.section>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
