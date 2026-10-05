import { cn } from '@/lib/cn';

interface GlassPanelProps {
  /** Small-caps panel heading. */
  title: string;
  /** Optional node rendered at the top-right (e.g. an overflow menu). */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * GlassPanel — the frosted data panel used across every dashboard screen.
 * Matches the reference grid: thin border, dense frosted surface, small-caps
 * header row with an optional action node.
 */
export function GlassPanel({ title, action, className, children }: GlassPanelProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-2xl border border-line bg-surface/70 backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 pb-1 pt-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          {title}
        </h3>
        {action}
      </header>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </section>
  );
}
