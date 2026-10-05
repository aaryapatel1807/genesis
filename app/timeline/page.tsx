'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hourglass, Loader2 } from 'lucide-react';
import { useWorldStore } from '@/stores/useWorldStore';
import { useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { AppShell } from '@/components/layout/AppShell';
import { GlassPanel } from '@/components/dash/GlassPanel';
import { StatPanel } from '@/components/dash/StatPanel';
import { TimeSlider } from '@/components/TimeSlider';
import type { GNode, NodeType, World } from '@/lib/types';
import { Toast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';

const YEARS = [2020, 2022, 2024, 2026] as const;

/** Full class literals so Tailwind's scanner picks up every type color. */
const TYPE_DOT: Record<NodeType, string> = {
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

interface TimelineEvent {
  year: number;
  node: GNode;
  firstOfYear: boolean;
}

async function fetchSnapshot(year: number): Promise<World> {
  const res = await fetch(`/api/world/snapshot/${year}`);
  if (!res.ok) throw new Error(`Snapshot ${year} failed with status ${res.status}`);
  return (await res.json()) as World;
}

/**
 * Timeline Explorer — temporal events and milestones across the world
 * snapshots. Events are real nodes whose first_seen falls in each snapshot
 * year; the Time Travel control scrubs the selected year and refreshes the
 * readout panel with that snapshot's true counts.
 */
export default function TimelinePage() {
  const router = useRouter();
  const { container, enterUp } = useMotionVariants();
  const announce = useWorldStore((s) => s.announce);

  const [snapshots, setSnapshots] = useState<Partial<Record<number, World>>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [travelYear, setTravelYear] = useState<number>(2026);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled(YEARS.map((y) => fetchSnapshot(y)));
      if (cancelled) return;
      const next: Partial<Record<number, World>> = {};
      let ok = 0;
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          next[YEARS[i]] = r.value;
          ok += 1;
        }
      });
      setSnapshots(next);
      setFailed(ok === 0);
      if (ok > 0) {
        const total = Object.values(next).reduce((a, w) => a + (w?.meta.node_count ?? 0), 0);
        announce(`Timeline loaded: ${ok} snapshots, ${total} entities across time.`);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [announce]);

  const events = useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];
    for (const year of YEARS) {
      const world = snapshots[year];
      if (!world) continue;
      const yearNodes = world.nodes
        .filter((n) => n.first_seen.startsWith(String(year)))
        .sort((a, b) => b.influence - a.influence)
        .slice(0, 5);
      yearNodes.forEach((node, i) => {
        out.push({ year, node, firstOfYear: i === 0 });
      });
    }
    return out;
  }, [snapshots]);

  const readout = useMemo(() => {
    const world = snapshots[travelYear];
    if (!world) return null;
    const top = [...world.nodes]
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 5);
    return {
      stats: [
        { label: 'Nodes', value: String(world.meta.node_count) },
        { label: 'Edges', value: String(world.meta.edge_count) },
        { label: 'Sources', value: String(world.meta.source_count) },
      ],
      top,
    };
  }, [snapshots, travelYear]);

  const stepYear = useCallback(
    (dir: 1 | -1) => {
      const idx = YEARS.indexOf(travelYear as (typeof YEARS)[number]);
      const next = YEARS[idx + dir];
      if (next !== undefined) {
        setTravelYear(next);
        announce(`Time travel: ${next}.`);
      }
    },
    [travelYear, announce],
  );

  const handleTravelKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepYear(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepYear(1);
      }
    },
    [stepYear],
  );

  const selectYear = useCallback(
    (y: number) => {
      setTravelYear(y);
      announce(`Time travel: ${y}.`);
    },
    [announce],
  );

  const retry = useCallback(() => {
    setLoading(true);
    setFailed(false);
    void (async () => {
      const results = await Promise.allSettled(YEARS.map((y) => fetchSnapshot(y)));
      const next: Partial<Record<number, World>> = {};
      let ok = 0;
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          next[YEARS[i]] = r.value;
          ok += 1;
        }
      });
      setSnapshots(next);
      setFailed(ok === 0);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell chrome="app" title="Timeline Explorer">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col gap-3 p-3 sm:p-4"
        >
          {/* Timeline track */}
          <motion.section variants={enterUp} aria-label="Ecosystem timeline" className="min-h-0">
            <GlassPanel
              title="Temporal Events & Milestones"
              action={
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                  <Hourglass size={12} aria-hidden="true" className="text-gold" />
                  {events.length} events
                </span>
              }
              className="min-h-0"
            >
              {loading ? (
                <div className="grid h-64 place-items-center">
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 size={14} aria-hidden="true" className="animate-spin text-gold" />
                    Assembling the timeline…
                  </p>
                </div>
              ) : events.length === 0 ? (
                <div className="grid h-64 place-items-center">
                  <EmptyState
                    message="No dated entities found across the snapshots."
                    hint="The timeline needs first_seen dates on its nodes."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto pb-2" role="region" aria-label="Scrollable timeline" tabIndex={0}>
                  <div className="relative min-w-[1024px] px-6">
                    {/* The line */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-gold/50 to-transparent"
                    />
                    <ol
                      aria-label="Timeline events"
                      className="relative grid"
                      style={{ gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))` }}
                    >
                      {events.map((ev, i) => (
                        <motion.li
                          key={`${ev.year}-${ev.node.id}`}
                          variants={enterUp}
                          className="grid grid-rows-[1fr_auto_1fr] px-2"
                          style={{ minHeight: 380 }}
                        >
                          {/* Card above the line */}
                          <div className="flex items-end pb-7">
                            {i % 2 === 0 && (
                              <EventCard
                                event={ev}
                                onOpen={() => router.push(`/entity/${ev.node.id}`)}
                              />
                            )}
                          </div>
                          {/* Marker on the line */}
                          <div className="flex items-center justify-center gap-2 py-1">
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-3 w-3 shrink-0 rounded-full shadow-[0_0_14px_var(--gold)]',
                                TYPE_DOT[ev.node.type],
                              )}
                            />
                            {ev.firstOfYear && (
                              <span className="font-mono text-[11px] font-semibold text-gold">
                                {ev.year}
                              </span>
                            )}
                          </div>
                          {/* Card below the line */}
                          <div className="flex items-start pt-7">
                            {i % 2 !== 0 && (
                              <EventCard
                                event={ev}
                                onOpen={() => router.push(`/entity/${ev.node.id}`)}
                              />
                            )}
                          </div>
                        </motion.li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </GlassPanel>
          </motion.section>

          {/* Time travel + readout */}
          <motion.section
            variants={enterUp}
            aria-label="Time travel"
            className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <GlassPanel title="Time Travel" className="min-h-0">
              <div
                role="group"
                aria-label="Time travel controls — use left and right arrow keys to change year"
                tabIndex={0}
                onKeyDown={handleTravelKey}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                <TimeSlider year={travelYear} onChange={selectYear} />
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted">
                Scrub the year — or use ← → keys — to inspect each snapshot of the ecosystem.
              </p>
            </GlassPanel>

            <div className="flex min-h-0 flex-col gap-3">
              <StatPanel
                title={`Readout · ${travelYear}`}
                stats={readout?.stats ?? []}
                footer={readout ? `${readout.top.length} top entities shown` : undefined}
              />
              <GlassPanel title="Top Entities" className="min-h-0 flex-1">
                <ul className="flex flex-col gap-1">
                  {(readout?.top ?? []).map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/entity/${node.id}`)}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                      >
                        <span
                          aria-hidden="true"
                          className={cn('h-2 w-2 shrink-0 rounded-full', TYPE_DOT[node.type])}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink group-hover:text-gold">
                            {node.name}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {node.type} · influence {node.influence}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </div>
          </motion.section>
        </motion.div>

        {/* Load error */}
        {failed && !loading && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-void/80">
            <div className="w-full max-w-sm rounded-[14px] border border-line bg-surface p-6 text-center">
              <p className="text-[15px] font-semibold">The timeline is offline</p>
              <p className="mt-2 text-[13px] text-muted">
                None of the world snapshots could be loaded. Check your connection and retry.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 rounded-xl bg-gold px-6 py-2.5 text-[14px] font-semibold text-void transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-20 right-4 z-30">
          <Toast />
        </div>
      </div>
    </AppShell>
  );
}

function EventCard({
  event,
  onOpen,
}: {
  event: TimelineEvent;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${event.node.name}, ${event.node.type}, ${event.year} — open entity`}
      className="group w-full rounded-xl border border-line bg-surface-2/60 p-3 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn('h-2 w-2 shrink-0 rounded-full', TYPE_DOT[event.node.type])}
        />
        <span className="truncate text-[13px] font-semibold text-ink group-hover:text-gold">
          {event.node.name}
        </span>
      </span>
      <span className="mt-1.5 block font-mono text-[11px] text-muted">
        {event.node.type} · {event.year}
      </span>
      <span className="mt-1.5 line-clamp-2 block text-[12px] leading-snug text-muted">
        {event.node.description}
      </span>
    </button>
  );
}
