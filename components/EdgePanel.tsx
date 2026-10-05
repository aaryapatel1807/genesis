'use client';

import type { GEdge, Strength } from '@/lib/types';

interface EdgePanelProps {
  edge: GEdge;
  sourceName: string;
  targetName: string;
  onClose: () => void;
}

const STRENGTH_STYLE: Record<Strength, { dot: string; label: string }> = {
  strong: { dot: '#4ade80', label: 'Strong' },
  medium: { dot: '#f5b942', label: 'Medium' },
  weak: { dot: '#ef4444', label: 'Weak' },
};

export function EdgePanel({ edge, sourceName, targetName, onClose }: EdgePanelProps) {
  const strength = STRENGTH_STYLE[edge.strength];

  return (
    <div
      aria-label={`Why ${sourceName} and ${targetName} are connected`}
      className="animate-sheet-bottom pointer-events-auto max-h-[40vh] w-full max-w-3xl overflow-y-auto rounded-t-[14px] border-t border-line bg-surface p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Why connected
          </p>
          <h2 className="mt-2 text-[16px] font-semibold leading-snug">
            {sourceName}{' '}
            <span className="text-gold">{edge.relation}</span> {targetName}
          </h2>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[11px]">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: strength.dot }}
            />
            {strength.label} connection
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {edge.evidence.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {edge.evidence.map((ev, i) => (
            <li
              key={`${ev.url}-${i}`}
              className="rounded-lg border border-line bg-surface-2 p-3"
            >
              <blockquote className="text-[13px] leading-relaxed text-ink/90">
                “{ev.snippet}”
              </blockquote>
              <p className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
                <span>
                  {ev.engine} · {ev.date}
                </span>
                {ev.url && (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal hover:underline"
                  >
                    source
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M10 6V3h3v3M13 3L7 9M11 5H5a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V9" />
                    </svg>
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[13px] text-muted">
          No evidence snippets recorded for this connection yet.
        </p>
      )}
    </div>
  );
}
