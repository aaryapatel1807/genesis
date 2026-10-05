'use client';

interface SerendipityButtonProps {
  onSurprise: () => void;
  disabled?: boolean;
}

export function SerendipityButton({ onSurprise, disabled }: SerendipityButtonProps) {
  return (
    <button
      type="button"
      onClick={onSurprise}
      disabled={disabled}
      className="flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-[13px] font-medium text-ink backdrop-blur-md transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="12" height="12" rx="2.5" />
        <circle cx="5.6" cy="5.6" r="1.05" fill="currentColor" stroke="none" />
        <circle cx="10.4" cy="5.6" r="1.05" fill="currentColor" stroke="none" />
        <circle cx="5.6" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
        <circle cx="10.4" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      </svg>
      Surprise me
    </button>
  );
}
