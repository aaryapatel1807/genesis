'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { GENESIS_EASE } from '@/lib/motion';

/**
 * FloatingAgents — collapsible floating glass panel tracking the 10 Genesis
 * agents through the generation sequence.
 *
 * Agent stage mapping:
 *   Planner → searching
 *   Explorer, Search, Evidence → discovering
 *   Relationship → relationships
 *   Ranking, Simulation, Narrator → generating
 *   Memory, WorldBuilder → blooming
 *
 * Status per agent: earlier stages = teal "Done", current stage = pulsing
 * "Working…", later stages = dimmed "Waiting". 'ready' = all Done;
 * 'idle' / unknown = all Waiting.
 *
 * The panel collapses to a pill ("AI Agents") when idle/ready and
 * auto-expands during active phases. Collapsed state is user-toggleable.
 */

const STAGE_ORDER = [
  'searching',
  'discovering',
  'relationships',
  'generating',
  'blooming',
] as const;

type Stage = (typeof STAGE_ORDER)[number];

const AGENTS: { name: string; stage: Stage }[] = [
  { name: 'Planner', stage: 'searching' },
  { name: 'Explorer', stage: 'discovering' },
  { name: 'Search', stage: 'discovering' },
  { name: 'Evidence', stage: 'discovering' },
  { name: 'Relationship', stage: 'relationships' },
  { name: 'Ranking', stage: 'generating' },
  { name: 'Simulation', stage: 'generating' },
  { name: 'Narrator', stage: 'generating' },
  { name: 'Memory', stage: 'blooming' },
  { name: 'WorldBuilder', stage: 'blooming' },
];

type AgentStatus = 'done' | 'working' | 'waiting';

function statusFor(agentStage: Stage, phase: string): AgentStatus {
  if (phase === 'ready') return 'done';
  const stageIdx = STAGE_ORDER.indexOf(agentStage);
  const phaseIdx = STAGE_ORDER.indexOf(phase as Stage);
  if (phaseIdx < 0) return 'waiting'; // idle or unknown phase
  if (phaseIdx > stageIdx) return 'done';
  if (phaseIdx === stageIdx) return 'working';
  return 'waiting';
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  done: 'Done',
  working: 'Working…',
  waiting: 'Waiting',
};

function StatusGlyph({ status, reduced }: { status: AgentStatus; reduced: boolean }) {
  if (status === 'done') {
    return <Check size={14} aria-hidden="true" style={{ color: 'var(--teal)' }} />;
  }
  if (status === 'working') {
    return (
      <motion.span
        aria-hidden="true"
        animate={reduced ? { opacity: 1 } : { opacity: [1, 0.25, 1] }}
        transition={reduced ? { duration: 0 } : { repeat: Infinity, duration: 1.2 }}
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--amber)',
          boxShadow: '0 0 10px var(--amber)',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '1px solid var(--mut)',
        flexShrink: 0,
      }}
    />
  );
}

export function FloatingAgents({
  phase,
  className,
}: {
  phase: string;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const active = STAGE_ORDER.includes(phase as Stage);
  const allDone = phase === 'ready';

  // Follow the phase by default; a manual toggle overrides until the next
  // render — kept simple and predictable per spec (pill when idle/ready,
  // auto-expanded during active phases).
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = manual ?? active;

  const workingCount = AGENTS.filter(
    (a) => statusFor(a.stage, phase) === 'working',
  ).length;

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 96,
        zIndex: 40,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div
        className="glass"
        style={{ padding: expanded ? 16 : 0, borderRadius: 999 }}
        aria-live="polite"
        aria-label="AI agents status"
      >
        <button
          type="button"
          onClick={() => setManual(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse AI agents panel' : 'Expand AI agents panel'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'none',
            border: 0,
            color: 'var(--cream)',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            padding: expanded ? '0 4px 12px' : '10px 16px',
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {allDone && (
              <Check size={14} aria-hidden="true" style={{ color: 'var(--teal)' }} />
            )}
            AI Agents
            {active && (
              <span className="mono" style={{ color: 'var(--mut)', fontSize: 12 }}>
                {workingCount} working
              </span>
            )}
          </span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: GENESIS_EASE }}
            style={{ display: 'inline-flex', color: 'var(--mut)' }}
          >
            <ChevronDown size={16} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="agents-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: reduced ? 0 : 0.3,
                ease: GENESIS_EASE,
              }}
              style={{ overflow: 'hidden' }}
            >
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {AGENTS.map((agent) => {
                  const status = statusFor(agent.stage, phase);
                  return (
                    <li
                      key={agent.name}
                      className="step"
                      style={{
                        opacity: status === 'waiting' ? 0.45 : 1,
                        padding: '7px 4px',
                      }}
                    >
                      <StatusGlyph status={status} reduced={reduced} />
                      <span style={{ flex: 1 }}>{agent.name}</span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          color:
                            status === 'done'
                              ? 'var(--teal)'
                              : status === 'working'
                                ? 'var(--amber)'
                                : 'var(--mut)',
                        }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
