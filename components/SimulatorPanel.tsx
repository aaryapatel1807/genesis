'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import type { SimCascadeItem } from '@/lib/types';
import { Button } from './ui/button';
import { useMotionVariants } from '@/lib/motion';

interface SimulatorPanelProps {
  simulating: boolean;
  items: SimCascadeItem[];
  onSimulate: (scenario: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const IMPACT_STYLE: Record<SimCascadeItem['impact'], string> = {
  high: 'bg-red/15 text-red border-red/40',
  medium: 'bg-gold/15 text-gold border-gold/40',
  low: 'bg-teal/15 text-teal border-teal/40',
};

export function SimulatorPanel({
  simulating,
  items,
  onSimulate,
  onReset,
  onClose,
}: SimulatorPanelProps) {
  const [scenario, setScenario] = useState('');
  const active = simulating || items.length > 0;
  const { container, enterUp } = useMotionVariants();

  const submit = (): void => {
    const trimmed = scenario.trim();
    if (!trimmed || simulating) return;
    onSimulate(trimmed);
  };

  return (
    <aside
      aria-label="Scenario simulator"
      className="pointer-events-auto flex h-full w-[340px] max-w-[92vw] flex-col overflow-y-auto rounded-r-[14px] border-r border-line bg-surface p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      {/* Undismissable SIMULATION banner — clears only via Reset */}
      {active && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-xl bg-red px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.15em] text-white"
        >
          <span>Simulation</span>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-normal transition-colors hover:bg-white/25"
          >
            Reset
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold">Simulator</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Describe a what-if scenario. The model traces the cascade through
            the universe.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close simulator"
          className="rounded-md p-1.5 text-muted transition-all hover:scale-110 hover:bg-surface-2 hover:text-ink active:scale-95"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <label
        htmlFor="scenario"
        className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted"
      >
        Scenario
      </label>
      <textarea
        id="scenario"
        value={scenario}
        onChange={(e) => setScenario(e.target.value)}
        maxLength={200}
        rows={3}
        disabled={simulating}
        placeholder="e.g. OpenAI open-sources GPT-5 weights"
        className="mt-2 w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-ink placeholder:text-muted/60 focus:border-gold/60 focus:outline-none disabled:opacity-50"
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>Max 200 characters</span>
        <span className="font-mono">{scenario.length}/200</span>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={submit}
        loading={simulating}
        disabled={scenario.trim().length === 0}
        icon={<Zap size={16} aria-hidden="true" />}
        className="mt-3 w-full"
      >
        {simulating ? 'Simulating…' : 'Run simulation'}
      </Button>

      {items.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Cascade ({items.length})
          </h3>
          <motion.ol
            initial="hidden"
            animate="show"
            variants={container}
            className="mt-3 space-y-2"
          >
            {items.map((c, i) => (
              <motion.li
                key={`${c.nodeId}-${i}`}
                variants={enterUp}
                className="rounded-lg border border-line bg-surface-2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${IMPACT_STYLE[c.impact]}`}
                  >
                    {c.impact}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] font-semibold">{c.nodeName}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  {c.effect}
                </p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      )}

      {!simulating && items.length === 0 && (
        <p className="mt-5 text-[12px] leading-relaxed text-muted">
          Affected entities will pulse gold on the canvas; everything else
          dims. This is a model projection, not a prediction.
        </p>
      )}
    </aside>
  );
}
