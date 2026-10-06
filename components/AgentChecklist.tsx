'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * AgentChecklist — the "wow" loading experience.
 *
 * A vertical agent checklist: Planner -> Explorer -> Evidence ->
 * Relationship -> Simulation -> World Ready finale. Statuses are derived
 * from the `phase` string, so any caller (/simulate, /world, /generator)
 * can wire its real pipeline phase straight in — matching is
 * case-insensitive and alias-aware (see `match` on each step). The /world
 * page passes its GenPhase directly; it is a string and matches the same
 * way.
 *
 * No generic spinner: completed steps get an animated check draw,
 * the active step pulses, pending steps sit dimmed.
 * Screen readers get a polite live region announcing the current step.
 */

export interface AgentStep {
  id: string;
  label: string;
  copy: string;
  /** Case-insensitive matcher against the caller's phase string. */
  match: RegExp;
}

export const AGENT_STEPS: AgentStep[] = [
  {
    id: 'planner',
    label: 'Planner',
    copy: 'Creating search plan…',
    match: /plan|prompt|brief/i,
  },
  {
    id: 'explorer',
    label: 'Explorer',
    copy: 'Searching…',
    match: /explor|search|discover|extract|gather/i,
  },
  {
    id: 'evidence',
    label: 'Evidence',
    copy: 'Reading sources…',
    match: /evidence|source|valid|verif|citation|anchor/i,
  },
  {
    id: 'relationship',
    label: 'Relationship',
    copy: 'Connecting entities…',
    match: /relation|link|connect|map/i,
  },
  {
    id: 'simulation',
    label: 'Simulation',
    copy: 'Preparing…',
    match: /simulat|generat|project|scenario/i,
  },
  {
    id: 'ready',
    label: 'World Ready',
    copy: 'Everything is in place.',
    match: /ready|done|complete|bloom|finish|success/i,
  },
];

/** Resolve a caller's phase string to the active checklist index. */
export function agentStepIndex(phase: string): number {
  const p = (phase ?? '').trim();
  if (!p) return 0;
  const lowered = p.toLowerCase();
  const idx = AGENT_STEPS.findIndex((s) => s.id === lowered || s.match.test(p));
  return idx < 0 ? 0 : idx;
}

function DrawnCheck({ reduced }: { reduced: boolean }): React.JSX.Element {
  if (reduced) {
    return <Check size={13} strokeWidth={3} aria-hidden="true" />;
  }
  return (
    <svg viewBox="0 0 20 20" width={13} height={13} aria-hidden="true">
      <motion.path
        d="M4 10.5 L8.5 15 L16 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </svg>
  );
}

function StepDot({
  state,
  reduced,
}: {
  state: 'done' | 'active' | 'pending';
  reduced: boolean;
}): React.JSX.Element {
  if (state === 'done') {
    return (
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold bg-gold/15 text-gold"
      >
        <DrawnCheck reduced={reduced} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span aria-hidden="true" className="relative grid h-6 w-6 shrink-0 place-items-center">
        {!reduced ? (
          <span className="absolute inset-0 animate-ping rounded-full border border-gold/60" />
        ) : null}
        <span className="grid h-6 w-6 place-items-center rounded-full border border-gold/70 bg-gold/10">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        </span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line"
    >
      <span className="h-1 w-1 rounded-full bg-muted/40" />
    </span>
  );
}

export function AgentChecklist({
  phase,
  className,
}: {
  /** The caller's real pipeline phase — matched alias-aware to a checklist step. */
  phase: string;
  className?: string;
}): React.JSX.Element {
  const reduced = useReducedMotion() ?? false;
  const activeIdx = agentStepIndex(phase);
  const complete = activeIdx >= AGENT_STEPS.length - 1;
  const current = AGENT_STEPS[activeIdx] ?? AGENT_STEPS[0];

  return (
    <div
      role="status"
      aria-busy={!complete}
      aria-label="Agent progress"
      className={cn('w-full', className)}
    >
      <ol className="space-y-3.5">
        {AGENT_STEPS.map((step, i) => {
          const done = i < activeIdx || complete;
          const active = i === activeIdx && !complete;
          const state = done ? 'done' : active ? 'active' : 'pending';
          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className="flex items-start gap-3"
            >
              <StepDot state={state} reduced={reduced} />
              <span className="min-w-0 flex-1 pt-0.5">
                <span
                  className={cn(
                    'block text-[13px] font-medium transition-colors duration-300',
                    done || active ? 'text-ink' : 'text-muted/45',
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    'block font-mono text-[11px] transition-colors duration-300',
                    done ? 'text-teal/80' : active ? 'text-gold' : 'text-muted/35',
                  )}
                >
                  {done ? 'Done' : step.copy}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Finale headline — visible wow moment, announced politely. */}
      <div aria-live="polite" className="mt-5">
        {complete ? (
          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: reduced ? 0.2 : 0.5 }}
            className="flex items-center gap-2 text-sm font-semibold text-gold"
            style={{ textShadow: '0 0 18px rgba(245,185,66,0.45)' }}
          >
            <StepDot state="done" reduced={reduced} />
            World Ready
          </motion.p>
        ) : (
          <p className="font-mono text-[11px] text-muted">
            <span className="text-ink">{current.label}</span>
            {' — '}
            {current.copy}
          </p>
        )}
      </div>
    </div>
  );
}
