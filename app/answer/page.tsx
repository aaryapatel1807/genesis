'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GenesisLogo } from '@/components/genesis/GenesisLogo';
import { LoadingScreen, STAGE_LABELS, STAGE_MS } from '@/components/genesis/LoadingScreen';
import { AnswerCard } from '@/components/genesis/AnswerCard';
import { RadialMap } from '@/components/genesis/RadialMap';
import { SourcesOverlay } from '@/components/genesis/SourcesOverlay';
import type { BuildAnswer } from '@/lib/build';

type Phase =
  | { kind: 'loading' }
  | { kind: 'done'; answer: BuildAnswer }
  | { kind: 'error'; code: string; message: string; detail?: string };

const MIN_LOADING_MS = STAGE_LABELS.length * STAGE_MS;

function AnswerFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get('q') ?? '').trim();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!q) {
      router.replace('/');
      return;
    }
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/build?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as unknown;
        const wait = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt.current));
        await new Promise((r) => setTimeout(r, wait));
        if (!live) return;
        if (!res.ok) {
          const d = data as { code?: string; error?: string; detail?: string };
          setPhase({
            kind: 'error',
            code: d.code ?? 'BUILD_FAILED',
            message: d.error ?? "We couldn't build that answer — please try again.",
            detail: d.detail,
          });
          return;
        }
        setPhase({ kind: 'done', answer: data as BuildAnswer });
      } catch {
        if (live) {
          setPhase({
            kind: 'error',
            code: 'NETWORK_ERROR',
            message: 'Could not reach Genesis — check your connection and try again.',
          });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [q, router]);

  if (!q) return null;

  if (phase.kind === 'loading') {
    return <LoadingScreen question={q} />;
  }

  return (
    <div className="genesis-qa">
      <header className="qa-nav qa-wrap">
        <div className="qa-nav-inner">
          <GenesisLogo />
          <button type="button" className="qa-pill-btn teal" onClick={() => router.push('/')}>
            Ask a new question
          </button>
        </div>
      </header>

      <main className="qa-wrap">
        {phase.kind === 'error' ? (
          <div className="qa-error-card" role="alert">
            <h2>Something went wrong</h2>
            <p>
              {phase.message}
              {phase.detail ? ` (${phase.detail})` : ''}
            </p>
            <button type="button" className="qa-pill-btn teal" onClick={() => router.push('/')}>
              Ask a new question
            </button>
          </div>
        ) : (
          <>
            <div className="qa-answer-head">
              <span className="qa-eyebrow">Your question</span>
              <h1>{phase.answer.question}</h1>
            </div>
            <div className="qa-answer-grid">
              <AnswerCard answer={phase.answer} />
              <RadialMap answer={phase.answer} onSeeSources={() => setSourcesOpen(true)} />
            </div>
            {sourcesOpen && (
              <SourcesOverlay
                sources={phase.answer.sources}
                trust={phase.answer.trust}
                onClose={() => setSourcesOpen(false)}
              />
            )}
          </>
        )}
      </main>

      <footer className="qa-footer qa-wrap">
        <span>Genesis — answers from live Google results, powered by SerpApi.</span>
        <a href="/world">Explore the world map →</a>
      </footer>
    </div>
  );
}

export default function AnswerPage() {
  return (
    <Suspense>
      <AnswerFlow />
    </Suspense>
  );
}
