'use client';

import { useState } from 'react';
import { BadgeCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { BuildAnswer, TrustRating } from '@/lib/build';
import { SourcesOverlay } from './SourcesOverlay';

const TRUST_COPY: Record<TrustRating, { icon: typeof BadgeCheck; cls: string }> = {
  'Well supported': { icon: BadgeCheck, cls: 'good' },
  'Some support': { icon: ShieldAlert, cls: 'some' },
  Unsure: { icon: ShieldQuestion, cls: 'unsure' },
};

/** Figma "The short answer" card + trust box. */
export function AnswerCard({ answer }: { answer: BuildAnswer }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const t = TRUST_COPY[answer.trust];
  const Icon = t.icon;

  return (
    <section className="qa-card" aria-label="The short answer">
      <h2>The short answer</h2>
      <div>
        {answer.answer.map((p, i) => (
          <div key={i} className="qa-point">
            <span className="n" aria-hidden="true">{i + 1}</span>
            <div>
              <p className="pt">{p.point}</p>
              <p className="ps">{p.sentence}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`qa-trust ${t.cls}`} role="note">
        <div>
          <p className="t">
            <Icon size={17} aria-hidden="true" />
            {answer.trust}
          </p>
          <p>
            Confirmed by {answer.supportingSources} source{answer.supportingSources === 1 ? '' : 's'}.
            Last checked today,{' '}
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
            {answer.note ? ` ${answer.note}` : ''}
          </p>
        </div>
      </div>

      <div className="qa-answer-actions">
        <button type="button" className="qa-pill-btn ghost" onClick={() => setSourcesOpen(true)}>
          See the sources
        </button>
      </div>

      {sourcesOpen && (
        <SourcesOverlay
          sources={answer.sources}
          trust={answer.trust}
          onClose={() => setSourcesOpen(false)}
        />
      )}
    </section>
  );
}
