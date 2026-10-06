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
 * kit: label / value rows with teal mono deltas.
 */
export function StatPanel({ title, stats, footer, className }: StatPanelProps) {
  return (
    <GlassPanel title={title} className={className}>
      <dl>
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-0"
          >
            <dt className="text-muted">{s.label}</dt>
            <dd className="flex items-baseline gap-2">
              <span className="font-mono text-[22px] tabular-nums text-ink">
                {s.value}
              </span>
              {s.delta ? (
                <span className="font-mono text-xs text-teal" aria-label={`change ${s.delta}`}>
                  {s.delta}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="pt-2 text-xs text-muted">{footer}</div> : null}
    </GlassPanel>
  );
}
