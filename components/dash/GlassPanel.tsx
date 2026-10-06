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
 * Reference-kit .glass: thin border, dense frosted gradient surface, 16px
 * radius, 18px blur, inset top highlight + deep shadow, 13px muted header row.
 */
export function GlassPanel({ title, action, className, children }: GlassPanelProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-2xl border border-line backdrop-blur-[18px]',
        'bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-5 pt-5">
        <h3 className="text-[13px] font-medium text-muted">{title}</h3>
        {action}
      </header>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </section>
  );
}
