'use client';

import { Radar } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Radar size={32} aria-hidden="true" className="text-muted" strokeWidth={1.5} />
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {hint ? <p className="max-w-sm text-[11px] text-muted/70">{hint}</p> : null}
    </div>
  );
}
