'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { GlassPanel } from '@/components/dash/GlassPanel';
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

export function EntityView({
  entity,
  evidence,
  events,
  neighbors,
}: EntityViewProps): React.JSX.Element {
  const { container, enterUp, enter } = useMotionVariants();
  const initial = entity.name.trim().charAt(0).toUpperCase() || '?';

  const statTiles: Array<{ label: string; value: string }> = [
    { label: 'Influence', value: String(entity.influence) },
    { label: 'Evidence', value: String(entity.evidenceCount) },
    { label: 'Sources', value: String(entity.sources) },
  ];

  const confidenceRows = neighbors.slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6">
      <Link
        href="/world"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to World
      </Link>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="cols c2 mt-6"
      >
        {/* Left — profile, stats, evidence, events -------------------- */}
        <div className="stack min-w-0">
          <motion.section variants={enterUp} aria-label="Entity profile" className="glass">
            <div className="flex items-center gap-5">
              <span
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-semibold"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, var(--gold-hi), var(--gold-lo))',
                  color: 'var(--gold-ink)',
                  boxShadow:
                    '0 0 32px color-mix(in srgb, var(--amber) 45%, transparent)',
                }}
              >
                {initial}
              </span>
              <div className="min-w-0">
                <span className="tag">{TYPE_LABEL[entity.type]}</span>
                <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-ink">
                  {entity.name}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {entity.description}
            </p>
            <dl className="mt-4 space-y-2 border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="mut text-[11px] uppercase tracking-[0.14em]">
                  First seen
                </dt>
                <dd className="text-right text-[13px] text-ink">{entity.firstSeen}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="mut text-[11px] uppercase tracking-[0.14em]">
                  Freshness
                </dt>
                <dd className="text-right text-[13px] text-ink">
                  {entity.freshnessDisplay}
                </dd>
              </div>
            </dl>
          </motion.section>

          <motion.section variants={enterUp} aria-label="Key statistics">
            <div className="cols c3e">
              {statTiles.map((s) => (
                <div key={s.label} className="glass">
                  <p className="mut text-[12px] uppercase tracking-[0.14em]">{s.label}</p>
                  <p className="big amber mono mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={enterUp} aria-label="Evidence">
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
          </motion.section>

          <motion.section variants={enterUp} aria-label="Recent events" className="glass">
            <h4>Recent events</h4>
            {events.length === 0 ? (
              <EmptyState
                message="No events recorded"
                hint="Dated events appear here once relations touching this entity carry evidence."
              />
            ) : (
              <ul>
                {events.map((row) => (
                  <li key={row.key} className="row">
                    <span className="mut mono w-24 shrink-0 text-[11px]">
                      {row.dateDisplay || 'undated'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">
                        {row.otherName}
                      </span>
                      <span className="teal mono block text-[10px] uppercase tracking-[0.14em]">
                        {row.relation}
                      </span>
                    </span>
                    <span className="mut mono shrink-0 text-[11px]">
                      {row.evidenceCount} {row.evidenceCount === 1 ? 'cite' : 'cites'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>

        {/* Right — confidence score, related entities ------------------ */}
        <div className="stack min-w-0">
          <motion.section variants={enterUp} aria-label="Confidence score">
            <GlassPanel title="Confidence score">
              <ul>
                {confidenceRows.map((n) => (
                  <li key={n.id} className="py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="mut truncate text-[12px]">{n.name}</span>
                      <span className="teal mono shrink-0 text-[12px]">
                        {n.confidence}%
                      </span>
                    </div>
                    <div
                      className="bar mt-1.5"
                      role="progressbar"
                      aria-label={`${n.name} confidence`}
                      aria-valuenow={n.confidence}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <i style={{ width: `${Math.max(0, Math.min(100, n.confidence))}%` }} />
                    </div>
                  </li>
                ))}
                <li className="py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] text-ink">Overall</span>
                    <span className="amber mono shrink-0 text-[12px]">
                      {entity.confidence}%
                    </span>
                  </div>
                  <div
                    className="bar g mt-1.5"
                    role="progressbar"
                    aria-label={`${entity.name} overall confidence`}
                    aria-valuenow={entity.confidence}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <i style={{ width: `${Math.max(0, Math.min(100, entity.confidence))}%` }} />
                  </div>
                </li>
              </ul>
            </GlassPanel>
          </motion.section>

          <motion.section variants={enterUp} aria-label="Related entities">
            <GlassPanel title="Related entities">
              {neighbors.length === 0 ? (
                <EmptyState message="No related entities" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {neighbors.map((n) => (
                    <Link
                      key={n.id}
                      href={`/entity/${n.id}`}
                      aria-label={`View ${n.name}`}
                      title={`${n.name} · ${TYPE_LABEL[n.type]} · ${n.relation}`}
                      className={cn(
                        'tag inline-flex items-center gap-1.5 transition-colors',
                        'hover:border-teal/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TYPE_BG[n.type])}
                        style={{ boxShadow: `0 0 8px ${TYPE_VAR[n.type]}` }}
                      />
                      {n.name}
                    </Link>
                  ))}
                </div>
              )}
            </GlassPanel>
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
}
