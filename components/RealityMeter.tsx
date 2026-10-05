'use client';

interface RealityMeterProps {
  confidence: number;
  freshness: string;
  sources: number;
}

export function RealityMeter({ confidence, freshness, sources }: RealityMeterProps) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  const barColor =
    confidence >= 0.7 ? 'var(--teal)' : confidence >= 0.4 ? 'var(--gold)' : 'var(--red)';

  return (
    <div aria-label={`Reality meter: ${pct}% confidence`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Reality
        </span>
        <span className="font-mono text-[12px]" style={{ color: barColor }}>
          {pct}%
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Freshness: {freshness} · {sources} {sources === 1 ? 'source' : 'sources'}
      </p>
    </div>
  );
}
