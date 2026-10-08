'use client';

import { useEffect, useState } from 'react';

/**
 * Figma "v2 / 1b Loading": centred modal with four timed stages.
 * Stages advance on a timer while the parent fetches /api/build; the
 * parent only swaps to results once the fetch resolves AND the minimum
 * stage time has elapsed, so the sequence always reads naturally.
 */

export const STAGE_LABELS = [
  'Searching Google for the latest results',
  'Reading the top articles',
  'Double-checking facts against sources',
  'Writing your answer in plain words',
] as const;

export const STAGE_MS = 2400;

export function LoadingScreen({ question }: { question: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= STAGE_LABELS.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), STAGE_MS);
    return () => clearTimeout(t);
  }, [stage]);

  const progress = Math.min(100, ((stage + 1) / STAGE_LABELS.length) * 100);

  return (
    <div className="genesis-qa">
      <div className="qa-loading">
        <div className="qa-loading-card" role="status" aria-live="polite">
          <span className="qa-logo-mark" aria-hidden="true" />
          <h2>Genesis is working on your answer</h2>
          <p className="qq">“{question}”</p>
          {STAGE_LABELS.map((label, i) => {
            const cls = i < stage ? 'done' : i === stage ? 'active' : 'next';
            const st = i < stage ? 'Done' : i === stage ? 'In progress' : 'Next';
            return (
              <div key={label} className={`qa-stage ${cls}`}>
                <span className="pulse" aria-hidden="true" />
                {label}
                <span className="st">{st}</span>
              </div>
            );
          })}
          <div className="qa-progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </div>
          <p className="qa-eta">About {Math.max(2, (STAGE_LABELS.length - stage - 1) * 3)} seconds left</p>
        </div>
      </div>
    </div>
  );
}
