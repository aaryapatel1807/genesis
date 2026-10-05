import { cn } from '@/lib/cn';
import { GlassPanel } from './GlassPanel';

export interface AgentItem {
  name: string;
  detail: string;
  /** 0–100 progress. */
  pct: number;
}

interface AgentPanelProps {
  title: string;
  agents: AgentItem[];
  className?: string;
}

const HAIRLINES = ['bg-teal', 'bg-gold'] as const;

/**
 * AgentPanel — the "Active AI Agents" panel from the reference grid:
 * icon dot, name, detail, and a thin gold/teal progress hairline per row.
 */
export function AgentPanel({ title, agents, className }: AgentPanelProps) {
  return (
    <GlassPanel title={title} className={className}>
      <ul className="divide-y divide-line/40">
        {agents.map((a, i) => {
          const pct = Math.max(0, Math.min(100, Math.round(a.pct)));
          const hairline = HAIRLINES[i % HAIRLINES.length] as string;
          return (
            <li key={a.name} className="flex items-center gap-3 py-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  hairline,
                  'shadow-[0_0_8px_currentColor]',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{a.name}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                    {pct}%
                  </span>
                </div>
                <p className="truncate text-xs text-muted">{a.detail}</p>
                <div
                  className="mt-1.5 h-px w-full bg-line/60"
                  role="progressbar"
                  aria-label={`${a.name} progress`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className={cn('h-px', hairline)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
