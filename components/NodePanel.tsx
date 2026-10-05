'use client';

import { useMemo } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import {
  NODE_COLORS,
  type Connection,
  type GNode,
} from '@/lib/types';
import { RealityMeter } from './RealityMeter';
import { Button } from './ui/button';

interface NodePanelProps {
  node: GNode;
  connections: Connection[];
  expanding: boolean;
  budgetExhausted: boolean;
  expandEmpty: boolean;
  onExpand: (nodeId: string) => void;
  onJump: (nodeId: string) => void;
  onClose: () => void;
}

export function NodePanel({
  node,
  connections,
  expanding,
  budgetExhausted,
  expandEmpty,
  onExpand,
  onJump,
  onClose,
}: NodePanelProps) {
  const color = NODE_COLORS[node.type] ?? '#e8edf4';

  // Source links gathered honestly from the connected edges' evidence.
  const sources = useMemo(() => {
    const seen = new Set<string>();
    const out: { url: string; engine: string; date: string }[] = [];
    for (const { edge } of connections) {
      for (const ev of edge.evidence) {
        if (!ev.url || seen.has(ev.url)) continue;
        seen.add(ev.url);
        out.push({ url: ev.url, engine: ev.engine, date: ev.date });
        if (out.length >= 5) break;
      }
      if (out.length >= 5) break;
    }
    return out;
  }, [connections]);

  return (
    <aside
      aria-label={`Details for ${node.name}`}
      className="pointer-events-auto flex h-full w-[340px] max-w-[92vw] flex-col overflow-y-auto rounded-l-[14px] border-l border-line bg-surface p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[11px] capitalize"
            style={{ color }}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
            />
            {node.type}
          </span>
          <h2 className="mt-3 text-[18px] font-semibold leading-tight">
            {node.name}
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted">
            first seen {node.first_seen} · influence {Math.round(node.influence)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1.5 text-muted transition-all hover:scale-110 hover:bg-surface-2 hover:text-ink active:scale-95"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-ink/90">
        {node.description}
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <RealityMeter
          confidence={node.reality.confidence}
          freshness={node.reality.freshness}
          sources={node.reality.sources}
        />
      </div>

      {connections.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Connected ({connections.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {connections.slice(0, 12).map(({ edge, other }) => (
              <li key={edge.id}>
                <button
                  type="button"
                  onClick={() => onJump(other.id)}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-left transition-colors hover:border-gold/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">
                      {other.name}
                    </span>
                    <span className="block font-mono text-[11px] capitalize text-muted">
                      {edge.relation} · {edge.strength}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: NODE_COLORS[other.type] ?? '#e8edf4',
                    }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Sources
          </h3>
          <ul className="mt-3 space-y-1.5">
            {sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-teal hover:underline"
                >
                  <span className="truncate">
                    {s.engine} · {s.date}
                  </span>
                  <ExternalLink size={12} aria-hidden="true" className="shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        {expandEmpty && (
          <p className="mb-3 text-[13px] text-muted">
            No further entities found in live search.
          </p>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={() => onExpand(node.id)}
          loading={expanding}
          disabled={budgetExhausted}
          icon={<Plus size={16} aria-hidden="true" />}
          className="w-full"
        >
          {expanding ? 'Expanding…' : 'Expand'}
        </Button>
        {budgetExhausted && (
          <p className="mt-2 text-[11px] text-amber-300">
            Live expansion paused — search budget exhausted. Showing cached
            universe.
          </p>
        )}
      </div>
    </aside>
  );
}
