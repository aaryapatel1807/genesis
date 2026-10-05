'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  FileSearch,
} from 'lucide-react';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { RealityMeter } from '@/components/RealityMeter';
import { EmptyState } from '@/components/EmptyState';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import type { NodeType } from '@/lib/types';

/* View-model types (built server-side in page.tsx) ------------------------ */

export interface EntityVM {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  influence: number;
  confidence: number;
  freshness: string;
  sources: number;
  firstSeen: string;
  evidenceCount: number;
  freshnessDisplay: string;
}

export interface EvidenceTileVM {
  snippet: string;
  url: string;
  engine: string;
  dateDisplay: string;
  /** Raw ISO date used for chronological sorting (never displayed). */
  dateISO: string;
  relation: string;
  otherName: string;
}

export interface EventRowVM {
  key: string;
  dateDisplay: string;
  /** Raw ISO date used for chronological sorting (never displayed). */
  dateISO: string;
  relation: string;
  otherName: string;
  evidenceCount: number;
}

export interface NeighborVM {
  id: string;
  name: string;
  type: NodeType;
  relation: string;
  confidence: number;
}

interface EntityViewProps {
  entity: EntityVM;
  evidence: EvidenceTileVM[];
  events: EventRowVM[];
  neighbors: NeighborVM[];
}

/* Type styling — full static class names so Tailwind generates them -------- */

const TYPE_TEXT: Record<NodeType, string> = {
  company: 'text-n-company',
  researcher: 'text-n-researcher',
  university: 'text-n-university',
  product: 'text-n-product',
  startup: 'text-n-startup',
  funder: 'text-n-funder',
  patent: 'text-n-patent',
  event: 'text-n-event',
  technology: 'text-n-technology',
  paper: 'text-n-paper',
  job: 'text-n-job',
  country: 'text-n-country',
  government: 'text-n-government',
  law: 'text-n-law',
};

const TYPE_BG: Record<NodeType, string> = {
  company: 'bg-n-company',
  researcher: 'bg-n-researcher',
  university: 'bg-n-university',
  product: 'bg-n-product',
  startup: 'bg-n-startup',
  funder: 'bg-n-funder',
  patent: 'bg-n-patent',
  event: 'bg-n-event',
  technology: 'bg-n-technology',
  paper: 'bg-n-paper',
  job: 'bg-n-job',
  country: 'bg-n-country',
  government: 'bg-n-government',
  law: 'bg-n-law',
};

const TYPE_VAR: Record<NodeType, string> = {
  company: 'var(--n-company)',
  researcher: 'var(--n-researcher)',
  university: 'var(--n-university)',
  product: 'var(--n-product)',
  startup: 'var(--n-startup)',
  funder: 'var(--n-funder)',
  patent: 'var(--n-patent)',
  event: 'var(--n-event)',
  technology: 'var(--n-technology)',
  paper: 'var(--n-paper)',
  job: 'var(--n-job)',
  country: 'var(--n-country)',
  government: 'var(--n-government)',
  law: 'var(--n-law)',
};

const TYPE_LABEL: Record<NodeType, string> = {
  company: 'Company',
  researcher: 'Researcher',
  university: 'University',
  product: 'Product',
  startup: 'Startup',
  funder: 'Funder',
  patent: 'Patent',
  event: 'Event',
  technology: 'Technology',
  paper: 'Paper',
  job: 'Job',
  country: 'Country',
  government: 'Government',
  law: 'Law',
};

function TypeBadge({ type }: { type: NodeType }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em]',
        TYPE_TEXT[type],
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', TYPE_BG[type])}
        style={{ boxShadow: `0 0 8px ${TYPE_VAR[type]}` }}
      />
      {TYPE_LABEL[type]}
    </span>
  );
}

export function EntityView({
  entity,
  evidence,
  events,
  neighbors,
}: EntityViewProps): React.JSX.Element {
  const { container, enterUp, enter } = useMotionVariants();
  const initial = entity.name.trim().charAt(0).toUpperCase() || '?';
  const facts: Array<{ label: string; value: string }> = [
    { label: 'Type', value: TYPE_LABEL[entity.type] },
    { label: 'First seen', value: entity.firstSeen },
    { label: 'Influence', value: String(entity.influence) },
    { label: 'Freshness', value: entity.freshnessDisplay },
    { label: 'Sources', value: String(entity.sources) },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
      <Link
        href="/world"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to World
      </Link>

      <motion.header
        variants={enterUp}
        initial="hidden"
        animate="show"
        className="mt-4"
      >
        <TypeBadge type={entity.type} />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {entity.name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          {entity.description}
        </p>
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-6 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px]"
      >
        {/* (a) Profile ------------------------------------------------ */}
        <motion.section variants={enterUp} aria-label="Entity profile">
          <GlassPanel title="Profile" className="h-full">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-2xl font-semibold"
                style={{
                  color: TYPE_VAR[entity.type],
                  borderColor: TYPE_VAR[entity.type],
                  backgroundColor: `color-mix(in srgb, ${TYPE_VAR[entity.type]} 16%, transparent)`,
                  boxShadow: `0 0 24px color-mix(in srgb, ${TYPE_VAR[entity.type]} 30%, transparent)`,
                }}
              >
                {initial}
              </span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  Evidence
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-ink">
                  <FileSearch size={16} aria-hidden="true" className="text-teal" />
                  {entity.evidenceCount}
                  <span className="text-xs font-normal text-muted">
                    {entity.evidenceCount === 1 ? 'item' : 'items'}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5">
              <RealityMeter
                confidence={entity.confidence}
                freshness={entity.freshnessDisplay}
                sources={entity.sources}
              />
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4">
              {facts.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-3">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    {f.label}
                  </dt>
                  <dd className="text-right text-[13px] text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </GlassPanel>
        </motion.section>

        {/* (b) Evidence + events -------------------------------------- */}
        <motion.section variants={enterUp} aria-label="Evidence and events">
          <div className="space-y-4">
            <GlassPanel
              title="Evidence"
              action={
                <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted">
                  {evidence.length}
                </span>
              }
            >
              {evidence.length === 0 ? (
                <EmptyState
                  message="No evidence captured yet"
                  hint="Evidence is attached when the pipeline verifies a relation touching this entity."
                />
              ) : (
                <ul className="space-y-3">
                  {evidence.map((tile, i) => (
                    <motion.li
                      key={`${tile.url}-${i}`}
                      variants={enter}
                      className="rounded-xl border border-line bg-surface-2/60 p-3"
                    >
                      <p className="text-[13px] leading-relaxed text-ink/90">
                        &ldquo;{tile.snippet}&rdquo;
                      </p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-teal">
                        {tile.relation} &middot; {tile.otherName}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span className="text-gold">{tile.engine}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{tile.dateDisplay}</span>
                        <a
                          href={tile.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-muted transition-colors hover:text-gold"
                          aria-label={`Open source: ${tile.engine}, ${tile.dateDisplay}`}
                        >
                          <ExternalLink size={12} aria-hidden="true" />
                          Source
                        </a>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </GlassPanel>

            <GlassPanel title="Events">
              {events.length === 0 ? (
                <EmptyState
                  message="No events recorded"
                  hint="Dated events appear here once relations touching this entity carry evidence."
                />
              ) : (
                <ul>
                  {events.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center gap-3 border-b border-line/60 py-2.5 last:border-0"
                    >
                      <span className="w-24 shrink-0 font-mono text-[11px] text-muted">
                        {row.dateDisplay || 'undated'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-ink">{row.otherName}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal">
                          {row.relation}
                        </p>
                      </div>
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">
                        {row.evidenceCount} {row.evidenceCount === 1 ? 'cite' : 'cites'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </div>
        </motion.section>

        {/* (c) Related entities + confidence -------------------------- */}
        <motion.section variants={enterUp} aria-label="Related entities">
          <div className="space-y-4">
            <GlassPanel title="Related Entities">
              {neighbors.length === 0 ? (
                <EmptyState message="No related entities" />
              ) : (
                <ul className="-mx-1">
                  {neighbors.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/entity/${n.id}`}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
                        aria-label={`View ${n.name}`}
                      >
                        <span
                          aria-hidden="true"
                          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TYPE_BG[n.type])}
                          style={{ boxShadow: `0 0 8px ${TYPE_VAR[n.type]}` }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] text-ink transition-colors group-hover:text-gold">
                            {n.name}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                            {TYPE_LABEL[n.type]} &middot; {n.relation}
                          </span>
                        </span>
                        <ArrowUpRight
                          size={14}
                          aria-hidden="true"
                          className="ml-auto shrink-0 text-muted transition-colors group-hover:text-gold"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>

            <GlassPanel title="Confidence">
              <ul className="space-y-3">
                {neighbors.slice(0, 8).map((n) => (
                  <li key={n.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11px] text-muted">{n.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-teal">
                        {n.confidence}%
                      </span>
                    </div>
                    <div
                      className="mt-1 h-1 overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-label={`${n.name} confidence`}
                      aria-valuenow={n.confidence}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${Math.max(0, Math.min(100, n.confidence))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
