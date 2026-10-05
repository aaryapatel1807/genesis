import { GlassPanel } from './GlassPanel';

export interface StatItem {
  label: string;
  value: string;
  /** e.g. "+12%" — rendered in teal mono. */
  delta?: string;
}

interface StatPanelProps {
  title: string;
  stats: StatItem[];
  footer?: React.ReactNode;
  className?: string;
}

/**
 * StatPanel — the dense "Knowledge Statistics" panel from the reference
 * grid: label / large value rows with teal delta chips.
 */
export function StatPanel({ title, stats, footer, className }: StatPanelProps) {
  return (
    <GlassPanel title={title} className={className}>
      <dl>
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-end justify-between gap-3 border-b border-line/50 py-2.5 last:border-0"
          >
            <div className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-ink">
                {s.value}
              </dd>
            </div>
            {s.delta ? (
              <span className="shrink-0 font-mono text-xs text-teal" aria-label={`change ${s.delta}`}>
                {s.delta}
              </span>
            ) : null}
          </div>
        ))}
      </dl>
      {footer ? <div className="pt-2 text-xs text-muted">{footer}</div> : null}
    </GlassPanel>
  );
}
