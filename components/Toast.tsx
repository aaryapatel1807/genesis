'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  kind?: 'info' | 'warn' | 'error';
  onDismiss: () => void;
}

const KIND_STYLES: Record<NonNullable<ToastProps['kind']>, string> = {
  info: 'border-line bg-surface text-ink',
  warn: 'border-amber-400/60 bg-amber-400/10 text-amber-200',
  error: 'border-red/60 bg-red/10 text-red',
};

export function Toast({ message, kind = 'info', onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={`animate-fade-in flex max-w-sm items-start gap-3 rounded-[14px] border px-4 py-3 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md ${KIND_STYLES[kind]}`}
    >
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-muted transition-colors hover:text-ink"
      >
        <svg
          width="14"
          height="14"
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
  );
}
