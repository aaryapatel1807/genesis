'use client';

import { useEffect, useMemo } from 'react';
import type { BuildSource, TrustRating } from '@/lib/build';

function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

/**
 * Figma "v2 / 2b Sources (overlay)": modal listing where the answer comes
 * from. Each row links to the real retrieved source URL; its pill shows
 * how many retrieved sources share that publisher (same rule as the
 * answer-level trust rating).
 */
export function SourcesOverlay({
  sources,
  trust,
  onClose,
}: {
  sources: BuildSource[];
  trust: TrustRating;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sources) {
      const d = domainOf(s.link);
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  }, [sources]);

  return (
    <div
      className="qa-overlay-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Where this answer comes from"
    >
      <div className="qa-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="qa-overlay-head">
          <div>
            <h2>Where this answer comes from</h2>
            <p className="sub">
              {sources.length} source{sources.length === 1 ? '' : 's'} used — overall: {trust}.
            </p>
          </div>
          <button type="button" className="qa-overlay-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="qa-source-list">
          {sources.map((s, i) => {
            const n = counts.get(domainOf(s.link)) ?? 1;
            const pill = n >= 4 ? 'good' : n >= 2 ? 'some' : 'unsure';
            const label = n >= 4 ? 'Well supported' : n >= 2 ? 'Some support' : 'Unsure';
            return (
              <a
                key={`${s.link}-${i}`}
                className="qa-source-row"
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="info">
                  <span className="name">{s.name}</span>
                  <span className="type" style={{ display: 'block' }}>
                    {s.date ? `Checked ${s.date}` : 'Web source'}
                  </span>
                </span>
                <span className={`qa-support-pill ${pill}`}>{label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
