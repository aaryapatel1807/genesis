'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { StatPanel } from '@/components/dash/StatPanel';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
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

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return <CheckCircle2 size={20} aria-hidden="true" className="shrink-0 text-teal" />;
  }
  if (state === 'active') {
    return (
      <Loader2 size={20} aria-hidden="true" className="shrink-0 animate-spin text-gold" />
    );
  }
  if (state === 'error') {
    return <X size={20} aria-hidden="true" className="shrink-0 text-red" />;
  }
  return <Circle size={20} aria-hidden="true" className="shrink-0 text-muted/50" />;
}

/** Animated dashed connector between pipeline steps (static under reduced motion). */
function Connector({ lit, reduced }: { lit: boolean; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className="ml-[9px] block h-6 w-px"
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

  return (
    <AppShell chrome="app" title="World Generator">
      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl">
        <motion.div variants={enterUp} className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            World Generator
          </h1>
          <p className="mt-1 text-sm text-muted">
            Generate synthetic knowledge domains from prompt
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* (a) Prompt input */}
          <motion.div variants={enterUp}>
            <GlassPanel title="Prompt Input" className="h-full">
              <label
                htmlFor="generator-prompt"
                className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted"
              >
                Generation prompt
              </label>
              <textarea
                id="generator-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                disabled={phase === 'generating'}
                className="w-full resize-y rounded-xl border border-line bg-void/60 p-3.5 text-sm leading-relaxed text-ink placeholder:text-muted/50 backdrop-blur-md transition-colors focus:border-teal/60 focus:outline-none disabled:opacity-60"
              />
              <Button
                variant="primary"
                className="mt-4 w-full"
                loading={phase === 'generating'}
                onClick={generate}
                icon={<Sparkles size={16} aria-hidden="true" />}
              >
                {phase === 'generating' ? 'Generating…' : 'Generate'}
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
                      <ul className="space-y-1.5">
                        {result.addedNodes.slice(0, 6).map((n) => (
                          <li
                            key={n.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-void/40 px-3 py-2"
                          >
                            <span className="truncate text-xs text-ink">{n.name}</span>
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">
                              {n.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : phase === 'generating' ? (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 size={15} aria-hidden="true" className="animate-spin text-gold" />
                    {anchorName
                      ? `Expanding from ${anchorName}…`
                      : 'Finding the best anchor node…'}
                  </p>
                ) : (
                  <EmptyState
                    message="No world generated yet."
                    hint="Describe a domain above and press Generate — the pipeline will expand the live universe from your prompt."
                  />
                )}
              </div>
            </GlassPanel>
          </motion.div>

          {/* (b) Pipeline flow */}
          <motion.div variants={enterUp}>
            <GlassPanel title="Pipeline" className="h-full">
              <ol aria-label="Generation pipeline">
                {PIPELINE.map((step, i) => {
                  const state = steps[i] as StepState;
                  const active = state === 'active';
                  return (
                    <li key={step.id}>
                      <div className="flex items-start gap-3">
                        <StepIcon state={state} />
                        <div className="min-w-0 pb-1">
                          <p className="text-sm font-medium text-ink">{step.label}</p>
                          <p className="text-xs text-muted">{step.detail}</p>
                        </div>
                      </div>
                      {i < PIPELINE.length - 1 ? (
                        <Connector lit={active || state === 'done'} reduced={reduced} />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </GlassPanel>
          </motion.div>

          {/* (c) Steps checklist */}
          <motion.div variants={enterUp}>
            <GlassPanel title="Steps" className="flex h-full flex-col">
              <ul className="space-y-1">
                {PIPELINE.map((step, i) => {
                  const state = steps[i] as StepState;
                  const status = STATUS_COPY[state];
                  return (
                    <li
                      key={step.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60"
                    >
                      <StepIcon state={state} />
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
              <div className="mt-auto border-t border-line/50 pt-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                  Estimated completion
                </p>
                <p className="mt-1 font-mono text-xs text-ink" aria-live="polite">
                  {phase === 'generating'
                    ? `Elapsed ${formatSeconds(elapsedMs)} · ~${etaSeconds.toFixed(0)}s left (typical)`
                    : phase === 'done' && finishedMs !== null
                      ? `Completed in ${formatSeconds(finishedMs)}`
                      : phase === 'error' && finishedMs !== null
                        ? `Stopped after ${formatSeconds(finishedMs)}`
                        : 'Press Generate to begin'}
                </p>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  );
}
