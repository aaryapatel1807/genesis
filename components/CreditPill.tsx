'use client';

interface CreditPillProps {
  used: number;
  total: number;
}

export function CreditPill({ used, total }: CreditPillProps) {
  const remaining = Math.max(total - used, 0);
  const low = total > 0 && remaining / total < 0.2;

  return (
    <div
      role="status"
      aria-label={`${used} of ${total} searches used`}
      title="SerpApi search budget"
      className={`flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] backdrop-blur-md ${
        low
          ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
          : 'border-line bg-surface/80 text-muted'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${low ? 'bg-amber-300' : 'bg-teal'}`}
      />
      {used}/{total} searches
    </div>
  );
}
