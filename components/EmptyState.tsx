'use client';

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="16" cy="16" r="9" strokeDasharray="3 3" />
        <circle cx="16" cy="16" r="2.5" fill="var(--muted)" stroke="none" />
      </svg>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {hint ? <p className="max-w-sm text-[11px] text-muted/70">{hint}</p> : null}
    </div>
  );
}
