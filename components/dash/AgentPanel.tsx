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
  /** Optional node at the top-right of the panel header (e.g. a .tag). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * AgentPanel — the "Active AI Agents" panel from the reference kit:
 * icon dot, name, detail, and a thin teal/amber progress hairline per row.
 */
export function AgentPanel({ title, agents, action, className }: AgentPanelProps) {
  return (
    <GlassPanel title={title} action={action} className={className}>
      <ul className="divide-y divide-line/40">
        {agents.map((a, i) => {
          const pct = Math.max(0, Math.min(100, Math.round(a.pct)));
          const barClass = i % 2 === 1 ? 'g' : '';
          return (
            <li key={a.name} className="flex items-center gap-3 py-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  i % 2 === 1 ? 'bg-amber' : 'bg-teal',
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
                  className={cn('bar mt-1.5', barClass)}
                  role="progressbar"
                  aria-label={`${a.name} progress`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
